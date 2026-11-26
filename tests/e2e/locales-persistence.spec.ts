import { expect, test } from "@playwright/test";
import { countColour, dataUrlToPng, loadFixture, openApp } from "./helpers/app";

type G = { screenshotGuru: { renderSlide(d: string, i: number, o: object): Promise<string>; getProject(): unknown } };

test("AC-4: German locale shows German text and screenshot; an untranslated locale falls back to the base", async ({ page }) => {
  await openApp(page);
  await loadFixture(page);
  const [en, de, fr] = await page.evaluate(async () => {
    const api = (window as unknown as G).screenshotGuru;
    return [await api.renderSlide("iphone", 0, { width: 660, locale: "en" }), await api.renderSlide("iphone", 0, { width: 660, locale: "de" }), await api.renderSlide("iphone", 0, { width: 660, locale: "fr" })];
  });
  expect(de).not.toBe(en);
  expect(fr, "fr has no translation, so it renders exactly like the base locale").toBe(en);
  expect(countColour(dataUrlToPng(de), "#f59e0b")).toBeGreaterThan(50);
  expect(countColour(dataUrlToPng(en), "#f59e0b")).toBeLessThan(5);
});

test("AC-6: project and images survive a reload (read back from IndexedDB)", async ({ page }) => {
  await openApp(page);
  await loadFixture(page);
  const before = await page.evaluate(() => JSON.stringify((window as unknown as G).screenshotGuru.getProject()));
  await page.waitForTimeout(800); // autosave debounce is 400 ms
  // VR-01: read the stored row directly, not through the app
  const stored = await page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        const req = indexedDB.open("screenshot-guru-state");
        req.onsuccess = () => {
          const get = req.result.transaction("kv").objectStore("kv").get("project");
          get.onsuccess = () => resolve(get.result ? JSON.stringify(get.result) : null);
          get.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      }),
  );
  expect(stored).toBe(before);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { screenshotGuru?: unknown }).screenshotGuru);
  await page.waitForFunction((b) => JSON.stringify((window as unknown as G).screenshotGuru.getProject()) === b, before, { timeout: 10_000 });
  const png = await page.evaluate(() => (window as unknown as G).screenshotGuru.renderSlide("iphone", 0, { width: 660, locale: "en" }));
  expect(countColour(dataUrlToPng(png), "#6366f1"), "screenshot image restored too").toBeGreaterThan(50);
});
