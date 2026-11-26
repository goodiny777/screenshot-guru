import { expect, test } from "@playwright/test";

// Requests the app may make; anything else is a privacy bug (checklist §13).
const ALLOWED = [/^http:\/\/localhost:4173\//, /^https:\/\/fonts\.googleapis\.com\//, /^https:\/\/fonts\.gstatic\.com\//, /^data:/, /^blob:/];

test("editor boots with the agent API and no errors", async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // A blocked font host (offline CI runner) is reported, not hidden: it is the only tolerated case.
    const fontNet = /fonts\.(googleapis|gstatic)\.com/.test(m.location().url ?? "") || /fonts\.(googleapis|gstatic)/.test(m.text());
    if (!fontNet) errors.push(`console: ${m.text()}`);
  });
  page.on("request", (r) => requests.push(r.url()));

  await page.goto("/");
  await page.waitForFunction(() => (window as unknown as { screenshotGuru?: { version: string } }).screenshotGuru?.version);
  const version = await page.evaluate(() => (window as unknown as { screenshotGuru: { version: string } }).screenshotGuru.version);
  expect(version).toMatch(/^\d+\.\d+\.\d+$/);

  // The editor chrome is rendered (top bar + canvas), not just the script.
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  const canvasWidth = await page.locator("canvas").first().evaluate((c: HTMLCanvasElement) => c.width);
  expect(canvasWidth).toBeGreaterThan(100);

  // A German browser (flip project) still gets the English editor and the en base locale.
  const locale = await page.evaluate(() => (window as unknown as { screenshotGuru: { getProject(): { activeLocale: string } } }).screenshotGuru.getProject().activeLocale);
  expect(locale).toBe("en");

  expect(errors).toEqual([]);
  const unexpected = requests.filter((u) => !ALLOWED.some((re) => re.test(u)));
  expect(unexpected).toEqual([]);
});
