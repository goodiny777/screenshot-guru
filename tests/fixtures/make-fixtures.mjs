// Generates SYNTHETIC test fixtures: fake app screenshots (en, de), an icon and
// a recipe project zip that mirrors skills/screenshot-guru/assets/example-project.json.
// These are not real app screenshots. Run: node tests/fixtures/make-fixtures.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { zipSync, strToU8 } from "fflate";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "generated");
fs.mkdirSync(path.join(out, "assets"), { recursive: true });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function image(w, h, paint) {
  const png = new PNG({ width: w, height: h, colorType: 2 });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * w + x) << 2;
      png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
    }
  return PNG.sync.write(png, { colorType: 2 });
}

// A phone UI: coloured header, white cards with a coloured dot and grey bars.
function screen(color, w = 603, h = 1311) {
  const c = hex(color);
  return image(w, h, (x, y) => {
    if (y < 260) return c;
    const row = Math.floor((y - 300) / 150), inRow = (y - 300) % 150;
    if (y > 300 && row < 6 && inRow < 125 && x > 30 && x < w - 30) {
      const cx = 85, cy = 300 + row * 150 + 62;
      if ((x - cx) ** 2 + (y - cy) ** 2 < 32 ** 2) return c;
      if (x > 135 && x < 135 + 180 + row * 30 && inRow > 40 && inRow < 58) return [31, 41, 55];
      if (x > 135 && x < 135 + 120 + row * 20 && inRow > 72 && inRow < 86) return [156, 163, 175];
      return [255, 255, 255];
    }
    return [246, 247, 251];
  });
}

const files = {
  "assets/home.png": screen("#6366f1"),
  "assets/stats.png": screen("#ec4899"),
  "assets/plan.png": screen("#14b8a6"),
  "assets/home-de.png": screen("#f59e0b"),
  "assets/icon.png": image(256, 256, (x, y) => ((x - 128) ** 2 + (y - 128) ** 2 < 70 ** 2 ? [255, 255, 255] : hex("#6366f1"))),
};

const project = {
  schema: "screenshot-guru/1",
  name: "Habitly",
  locales: ["en", "de"],
  icon: "assets/icon.png",
  decks: {
    iphone: {
      template: "midnight-glow",
      slides: [
        { layout: "hero", label: { en: "DAILY HABITS", de: "TÄGLICHE GEWOHNHEITEN" }, headline: { en: "Build habits\nthat **stick**", de: "Gewohnheiten,\ndie **bleiben**" }, screenshot: { en: "assets/home.png", de: "assets/home-de.png" } },
        { layout: "top", label: { en: "PROGRESS", de: "FORTSCHRITT" }, headline: { en: "See your **streaks**\ngrow", de: "Sieh deine **Serien**\nwachsen" }, screenshot: "assets/stats.png" },
        { layout: "duo", label: { en: "PLANNING", de: "PLANUNG" }, headline: { en: "Plan your **week**\nin a minute", de: "Plane deine **Woche**\nin einer Minute" }, screenshot: "assets/plan.png", screenshot2: "assets/home.png" },
        { layout: "claim", headline: { en: "Start **free**\ntoday", de: "Starte **gratis**\nheute" }, subline: { en: "No account needed", de: "Kein Konto nötig" } },
      ],
    },
    "android-phone": {
      template: "vivid-gradient",
      slides: [
        { headline: { en: "Build habits\nthat **stick**", de: "Gewohnheiten,\ndie **bleiben**" }, screenshot: "assets/home.png" },
        { headline: { en: "See your **streaks** grow", de: "Sieh deine **Serien** wachsen" }, screenshot: "assets/stats.png" },
      ],
    },
    "feature-graphic": { template: "midnight-glow", slides: [{ headline: { en: "Habits that **stick**", de: "Gewohnheiten, die **bleiben**" }, screenshot: "assets/home.png" }] },
    "wear-os": { template: "clean-light", slides: [{ screenshot: "assets/plan.png" }] },
    "event-card": { template: "panorama", slides: [{ layout: "side", label: { en: "THIS WEEK", de: "DIESE WOCHE" }, headline: { en: "30-day **streak** challenge", de: "30-Tage-**Serie**" }, screenshot: "assets/stats.png" }] },
  },
};

for (const [p, bytes] of Object.entries(files)) fs.writeFileSync(path.join(out, p), bytes);
fs.writeFileSync(path.join(out, "project.json"), JSON.stringify(project, null, 2));
const zip = zipSync({ "project.json": strToU8(JSON.stringify(project, null, 2)), ...Object.fromEntries(Object.entries(files).map(([k, v]) => [k, new Uint8Array(v)])) });
fs.writeFileSync(path.join(out, "habitly.zip"), zip);
console.log(`fixtures: ${Object.keys(files).length} images + project.json + habitly.zip in ${path.relative(process.cwd(), out)}`);
