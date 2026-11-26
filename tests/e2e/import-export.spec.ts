import { expect, test } from "@playwright/test";
import { countColour, decodePng, loadFixture, openApp, unzip } from "./helpers/app";

test.describe("import and export (epic AC-1, AC-2, AC-3)", () => {
  test("AC-1: fixture recipe zip opens 5 decks with no warnings", async ({ page }) => {
    await openApp(page);
    const r = await loadFixture(page);
    expect(r.devices.sort()).toEqual(["android-phone", "event-card", "feature-graphic", "iphone", "wear-os"]);
    expect(r.assets).toBe(5);
    expect(r.warnings).toEqual([]);
    // the canvas shows the imported deck
    await expect(page.locator("header select").first()).toHaveValue("iphone");
  });

  test("AC-2: export has every file at its exact size, RGB without alpha, with the screenshots drawn", async ({ page }) => {
    test.setTimeout(240_000);
    await openApp(page);
    await loadFixture(page);
    const sizes = { iphone: ['6.9" (Dynamic Island large)', '6.1" (Dynamic Island medium)'] };
    const r = await page.evaluate(
      (s) => (window as unknown as { screenshotGuru: { exportZip(o: object): Promise<{ files: number; missing: string[]; base64: string }> } }).screenshotGuru.exportZip({ devices: ["iphone", "android-phone", "feature-graphic", "wear-os"], locales: ["en", "de"], sizes: s, download: false, returnBase64: true }),
      sizes,
    );
    // iphone 2 sizes×2 locales×4 slides + android 2×2×2 + feature graphic 1×2×1 + wear 2×2×1
    expect(r.files).toBe(16 + 8 + 2 + 4);
    expect(r.missing).toEqual([]);
    const files = unzip(r.base64);
    const paths = Object.keys(files);
    expect(paths).toHaveLength(30);
    for (const p of paths) {
      expect(p).toMatch(/^(app-store|google-play|promo)\/[a-z0-9-]+\/\d+x\d+\/(en|de)\/\d{2}\.png$/);
      const [w, h] = p.split("/")[2].split("x").map(Number);
      const img = decodePng(files[p]);
      expect([img.width, img.height], p).toEqual([w, h]);
      expect(img.colorType, `${p} must be RGB (2), not RGBA (6)`).toBe(2);
    }
    // Content, not just shape (VR-06): the fixture screenshots' header colours appear.
    const en = decodePng(files["app-store/iphone/1320x2868/en/01.png"]);
    const de = decodePng(files["app-store/iphone/1320x2868/de/01.png"]);
    expect(countColour(en, "#6366f1")).toBeGreaterThan(200);
    expect(countColour(de, "#f59e0b"), "German slide uses the German screenshot").toBeGreaterThan(200);
    expect(countColour(de, "#6366f1"), "and not the English one").toBeLessThan(20);
    const wear = decodePng(files["google-play/wear-os/1080x1080/en/01.png"]);
    expect(countColour(wear, "#14b8a6")).toBeGreaterThan(200);
  });

  test("AC-3: Wear OS deck disables the Text button and text is a store error", async ({ page }) => {
    await openApp(page);
    await loadFixture(page);
    await page.locator("header select").first().selectOption("wear-os");
    await expect(page.getByRole("button", { name: "Text", exact: true })).toBeDisabled();
    const errors = await page.evaluate(() => {
      const api = (window as unknown as { screenshotGuru: { addLayer(d: string, s: number, l: object): string; validate(): { level: string; device: string; message: string }[] } }).screenshotGuru;
      api.addLayer("wear-os", 0, { type: "text", x: 10, y: 10, w: 300, h: 100, text: { en: "Hi" }, font: "Inter", weight: 700, size: 60, fill: { type: "solid", color: "#000" } });
      return api.validate().filter((w) => w.level === "error" && w.device === "wear-os").map((w) => w.message);
    });
    expect(errors.join()).toMatch(/slide 1: the store does not allow added text/);
    // negative: another deck's Text button stays enabled
    await page.locator("header select").first().selectOption("iphone");
    await expect(page.getByRole("button", { name: "Text", exact: true })).toBeEnabled();
  });
});
