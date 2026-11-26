import { expect, test } from "@playwright/test";
import { column, dataUrlToPng, loadFixture, meanAbsDiff, openApp } from "./helpers/app";

type Layer = { id: string; type: string; x: number; y: number; w: number; h: number };
type G = {
  screenshotGuru: {
    getDeck(d: string): { slides: { layers: Layer[] }[]; background: unknown; spanBackground: boolean };
    getProject(): { decks: Record<string, unknown> };
    updateLayer(d: string, s: number, id: string, p: object): boolean;
    addLayer(d: string, s: number, l: object): string;
    removeLayer(d: string, s: number, id: string): boolean;
    moveSlide(d: string, a: number, b: number): boolean;
    renderSlide(d: string, i: number, o: object): Promise<string>;
    loadProject(p: unknown): Promise<unknown>;
  };
};

test("AC-14: a device crossing slides 2→3 lines up at the shared edge", async ({ page }) => {
  await openApp(page);
  await loadFixture(page);
  const W = 1320;
  const { cross, apart, y, h } = await page.evaluate(async (W) => {
    const api = (window as unknown as G).screenshotGuru;
    const dev = api.getDeck("iphone").slides[1].layers.find((l) => l.type === "device")!;
    api.updateLayer("iphone", 1, dev.id, { x: W - dev.w / 2, rotation: 0 });
    const cross = [await api.renderSlide("iphone", 1, { width: W }), await api.renderSlide("iphone", 2, { width: W })];
    api.updateLayer("iphone", 1, dev.id, { x: (W - dev.w) / 2 });
    const apart = [await api.renderSlide("iphone", 1, { width: W }), await api.renderSlide("iphone", 2, { width: W })];
    return { cross, apart, y: dev.y, h: dev.h };
  }, W);
  const [a, b] = cross.map(dataUrlToPng);
  // compare the last column of slide 2 with the first column of slide 3, inside the phone's screen rows
  const y0 = Math.max(0, Math.round(y + h * 0.15)), y1 = Math.min(a.height, Math.round(y + h * 0.85));
  expect(y1 - y0, "band has rows to compare").toBeGreaterThan(300);
  const joined = meanAbsDiff(column(a, a.width - 1, y0, y1), column(b, 0, y0, y1));
  const [c, d] = apart.map(dataUrlToPng);
  const separate = meanAbsDiff(column(c, c.width - 1, y0, y1), column(d, 0, y0, y1));
  expect(joined, "edge columns match when the device crosses").toBeLessThan(6);
  expect(separate, "control: without the crossing device the edge columns differ more").toBeGreaterThan(joined);
});

test("AC-15: every edit undoes back to the original and redoes forward", async ({ page }) => {
  await openApp(page);
  await loadFixture(page);
  const original = await page.evaluate(() => JSON.stringify((window as unknown as G).screenshotGuru.getProject()));
  const final = await page.evaluate(() => {
    const api = (window as unknown as G).screenshotGuru;
    const d = api.getDeck("iphone");
    const id = d.slides[0].layers.find((l) => l.type === "device")!.id;
    api.updateLayer("iphone", 0, id, { x: 10 }); // move
    api.updateLayer("iphone", 0, id, { w: 500, h: 1000 }); // resize
    api.updateLayer("iphone", 0, id, { rotation: 12 }); // rotate
    api.updateLayer("iphone", 0, id, { hidden: true }); // hide
    api.updateLayer("iphone", 0, id, { locked: true }); // lock
    const dup = api.addLayer("iphone", 0, { ...d.slides[0].layers[0], id: "" }); // duplicate
    api.removeLayer("iphone", 0, dup); // delete
    api.moveSlide("iphone", 0, 1); // reorder
    return JSON.stringify(api.getProject());
  });
  expect(final).not.toBe(original);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < 8; i++) await page.keyboard.press("Control+z");
  expect(await page.evaluate(() => JSON.stringify((window as unknown as G).screenshotGuru.getProject()))).toBe(original);
  for (let i = 0; i < 8; i++) await page.keyboard.press("Control+Shift+z");
  expect(await page.evaluate(() => JSON.stringify((window as unknown as G).screenshotGuru.getProject()))).toBe(final);
});

test("AC-16: rich backgrounds render deterministically and differ from a solid one", async ({ page }) => {
  await openApp(page);
  await loadFixture(page);
  const [first, second, solid] = await page.evaluate(async () => {
    const api = (window as unknown as G).screenshotGuru;
    const a = await api.renderSlide("iphone", 0, { width: 400 });
    const b = await api.renderSlide("iphone", 0, { width: 400 });
    const p = JSON.parse(JSON.stringify(api.getProject()));
    const deck = p.decks.iphone;
    deck.background = { paint: { type: "solid", color: "#203040" } };
    deck.slides.forEach((s: { background?: unknown }) => delete s.background);
    await api.loadProject(p);
    return [a, b, await api.renderSlide("iphone", 0, { width: 400 })];
  });
  expect(second).toBe(first);
  expect(solid).not.toBe(first);
});
