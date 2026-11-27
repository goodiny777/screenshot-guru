import { expect, test } from "@playwright/test";
import { dataUrlToPng, openApp } from "./helpers/app";

type G = { screenshotGuru: { loadProject(p: unknown): Promise<unknown>; renderSlide(d: string, i: number, o: object): Promise<string> } };

/** Mean x of pure-red (highlight) and pure-black (plain) pixels of a one-line headline. */
async function colourCentres(page: import("@playwright/test").Page, locale: string, text: string, style = "color") {
  const url = await page.evaluate(async ({ locale, text, style }) => {
    const api = (window as unknown as G).screenshotGuru;
    await api.loadProject({
      schema: "screenshot-guru/1", name: "rtl", locales: [locale],
      decks: { "android-phone": { device: "android-phone", orientation: "portrait", spanBackground: false,
        background: { paint: { type: "solid", color: "#ffffff" } },
        slides: [{ id: "s1", layers: [{ id: "t", type: "text", x: 40, y: 800, w: 1000, h: 200, text: { [locale]: text },
          font: "Rubik", weight: 700, size: 90, align: "center", fill: { type: "solid", color: "#000000" },
          highlight: "#ff0000", highlightStyle: style }] }] } },
    });
    return api.renderSlide("android-phone", 0, { width: 1080, locale });
  }, { locale, text, style });
  const img = dataUrlToPng(url);
  let rs = 0, rn = 0, ks = 0, kn = 0;
  for (let y = 700; y < 1100; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      if (r > 220 && g < 40 && b < 40) { rs += x; rn++; }
      else if (r < 40 && g < 40 && b < 40) { ks += x; kn++; }
    }
  expect(rn, "highlight pixels drawn").toBeGreaterThan(100);
  expect(kn, "plain pixels drawn").toBeGreaterThan(100);
  return { red: rs / rn, black: ks / kn };
}

test("Hebrew: a highlighted last word is drawn on the left", async ({ page }) => {
  await openApp(page);
  const c = await colourCentres(page, "he", "מפת העולם **שלך**");
  expect(c.red).toBeLessThan(c.black);
});

test("Hebrew: the highlight pill follows its word to the left", async ({ page }) => {
  await openApp(page);
  const c = await colourCentres(page, "he", "מפת העולם **שלך**", "pill");
  expect(c.red).toBeLessThan(c.black);
});

test("English: a highlighted last word is still drawn on the right", async ({ page }) => {
  await openApp(page);
  const c = await colourCentres(page, "en", "Your world **map**");
  expect(c.red).toBeGreaterThan(c.black);
});
