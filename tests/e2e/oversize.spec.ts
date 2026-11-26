import { expect, test } from "@playwright/test";
import { openApp } from "./helpers/app";

type G = { screenshotGuru: Record<string, (...a: never[]) => Promise<unknown> | unknown> };

// Epic AC-21: a slide above the store's 8 MB limit is flagged, and JPEG is offered.
async function setup(page: import("@playwright/test").Page, noisy: boolean) {
  await openApp(page);
  await page.evaluate(async (noisy) => {
    const api = (window as unknown as G).screenshotGuru as unknown as {
      loadProject(p: object): Promise<unknown>; addAsset(id: string, src: string): Promise<string>; addLayer(d: string, s: number, l: object): string;
    };
    await api.loadProject({ schema: "screenshot-guru/1", name: "Big", locales: ["en"], decks: { chromebook: { template: "clean-light", slides: [{ headline: "Big **file**" }] } } });
    if (!noisy) return;
    // random RGB noise does not compress: a 3840×2160 PNG of it is ~25 MB
    const c = document.createElement("canvas");
    c.width = 1920; c.height = 1080;
    const g = c.getContext("2d")!;
    const img = g.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i++) img.data[i] = i % 4 === 3 ? 255 : (Math.random() * 256) | 0;
    g.putImageData(img, 0, 0);
    const id = await api.addAsset("noise", c.toDataURL("image/png"));
    api.addLayer("chromebook", 0, { type: "image", asset: id, x: 0, y: 0, w: 1920, h: 1080, fit: "fill", name: "Noise" });
  }, noisy);
}

test("noisy 4K slide is flagged as oversize and JPEG is offered", async ({ page }) => {
  test.setTimeout(180_000);
  await setup(page, true);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Export ZIP" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("larger than the store allows", { timeout: 120_000 });
  await expect(alert).toContainText("google-play/chromebook/3840x2160/en/01.png");
  // same export, smaller size: ~6 MB of noise stays under the 8 MB limit, so it is not listed
  await expect(alert).not.toContainText("1920x1080");
  await page.getByRole("button", { name: "Switch to JPEG" }).click();
  await expect(page.getByLabel("JPEG (smaller)")).toBeChecked();
});

test("a flat slide is not flagged", async ({ page }) => {
  test.setTimeout(180_000);
  await setup(page, false);
  const r = await page.evaluate(() => ((window as unknown as G).screenshotGuru as unknown as { exportZip(o: object): Promise<{ oversize: unknown[]; files: number }> }).exportZip({ download: false }));
  expect(r.files).toBe(2);
  expect(r.oversize).toEqual([]);
});
