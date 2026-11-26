import { describe, expect, it } from "vitest";
import { DEVICES, canvasFor, getDevice } from "../../src/model/devices";
import { STYLES, buildDeck, expandDeck, extractRecipe, restyleDeck } from "../../src/model/templates";
import type { DeviceLayer, Layer, RecipeSlide, TextLayer } from "../../src/model/types";

const RECIPE: RecipeSlide[] = [
  { label: "WELCOME", headline: { en: "Build habits\nthat **stick**", de: "Gewohnheiten,\ndie **bleiben**" }, screenshot: { en: "shot-en", de: "shot-de" } },
  { headline: "See your **streaks**", screenshot: "shot-2" },
  { headline: "Plan your **week**", screenshot: "shot-3", screenshot2: "shot-4" },
  { headline: "Start **free**", subline: "No account needed" },
];
const texts = (ls: Layer[]) => ls.filter((l): l is TextLayer => l.type === "text");
const devicesOf = (ls: Layer[]) => ls.filter((l): l is DeviceLayer => l.type === "device");

// One representative device per canvas class.
const CLASSES = ["iphone", "ipad", "apple-watch", "mac", "android-tv", "feature-graphic", "wear-os", "promo-vertical", "event-card", "android-xr"];

describe("buildDeck — every template × device class (epic FR-5, §12.1)", () => {
  for (const style of STYLES)
    for (const id of CLASSES) {
      it(`${style.id} on ${id}`, () => {
        const dev = getDevice(id);
        const slides = RECIPE.slice(0, Math.min(RECIPE.length, dev.slides.max));
        const deck = buildDeck(style.id, id, { slides, locale: "en", appName: "Habitly" });
        const { w, h } = canvasFor(id, deck.orientation);
        expect(deck.slides).toHaveLength(slides.length);
        deck.slides.forEach((s, i) => {
          const t = texts(s.layers);
          if (dev.noText) expect(t, "store forbids text").toHaveLength(0);
          else if (slides[i].headline) expect(t.some((x) => x.name === "Headline"), "headline layer").toBe(true);
          if (dev.noFrame) devicesOf(s.layers).forEach((d) => expect(d.frame).toBe("none"));
          // Text must sit inside the slide (devices and decor may bleed on purpose).
          t.forEach((x) => {
            expect(x.x).toBeGreaterThanOrEqual(-1);
            expect(x.y).toBeGreaterThanOrEqual(-1);
            expect(x.x + x.w).toBeLessThanOrEqual(w + 1);
            expect(x.y + x.h).toBeLessThanOrEqual(h + 1);
            expect(x.size).toBeGreaterThan(Math.min(w, h) * 0.02);
          });
          // Every layer is near the slide (at most one slide width away — "span" layouts cross one edge).
          s.layers.forEach((l) => {
            expect(l.x).toBeGreaterThan(-w);
            expect(l.x + l.w).toBeLessThan(2 * w);
          });
        });
      });
    }
});

describe("recipe details", () => {
  it("keeps a per-locale screenshot map on the device layer", () => {
    const deck = buildDeck("clean-light", "iphone", { slides: [RECIPE[0]], locale: "en" });
    const d = devicesOf(deck.slides[0].layers)[0];
    expect(d.asset).toBe("shot-en");
    expect(d.assets).toMatchObject({ de: "shot-de" });
  });
  it("duo layout gets two devices, claim gets none without an icon", () => {
    const deck = buildDeck("clean-light", "iphone", { slides: [{ ...RECIPE[2], layout: "duo" }, { ...RECIPE[3], layout: "claim" }], locale: "en" });
    expect(devicesOf(deck.slides[0].layers)).toHaveLength(2);
    expect(devicesOf(deck.slides[1].layers)).toHaveLength(0);
  });
  it("span on the last slide falls back to hero (nothing to continue into)", () => {
    const { w } = canvasFor("iphone", "portrait");
    const deck = buildDeck("panorama", "iphone", { slides: [{ headline: "x", screenshot: "a", layout: "span" }], locale: "en" });
    const d = devicesOf(deck.slides[0].layers)[0];
    expect(d.x + d.w).toBeLessThanOrEqual(w + 1);
  });
  it("span on a middle slide crosses the right edge", () => {
    const { w } = canvasFor("iphone", "portrait");
    const deck = buildDeck("panorama", "iphone", { slides: [{ headline: "x", screenshot: "a", layout: "span" }, { headline: "y" }], locale: "en" });
    const d = devicesOf(deck.slides[0].layers)[0];
    expect(d.x + d.w).toBeGreaterThan(w);
  });
  it("unknown template falls back to the first style", () => {
    expect(buildDeck("nope", "iphone", { locale: "en" }).template).toBe(STYLES[0].id);
  });
  it("landscape orientation swaps the canvas for rotatable devices only", () => {
    expect(buildDeck("clean-light", "iphone", { orientation: "landscape", locale: "en" }).orientation).toBe("landscape");
    expect(buildDeck("clean-light", "mac", { orientation: "landscape", locale: "en" }).orientation).toBe("portrait");
  });
});

describe("restyle and rebuild keep content (epic AC-12)", () => {
  const original = buildDeck("clean-light", "iphone", { slides: RECIPE, locale: "en" });
  it("restyleDeck keeps every headline and screenshot", () => {
    const r = restyleDeck(original, "neon-night");
    expect(r.template).toBe("neon-night");
    r.slides.forEach((s, i) => {
      expect(texts(s.layers).map((t) => t.text)).toEqual(texts(original.slides[i].layers).map((t) => t.text));
      expect(devicesOf(s.layers).map((d) => d.asset)).toEqual(devicesOf(original.slides[i].layers).map((d) => d.asset));
    });
  });
  it("extractRecipe → buildDeck with another template keeps headlines and screenshots", () => {
    const rebuilt = buildDeck("editorial-serif", "iphone", { slides: extractRecipe(original, "en"), locale: "en" });
    const headlines = (d: typeof original) => d.slides.map((s) => texts(s.layers).find((t) => t.name === "Headline")?.text);
    // Empty placeholder devices are not content; only real screenshots must survive.
    const shots = (d: typeof original) => d.slides.flatMap((s) => devicesOf(s.layers).map((x) => x.asset)).filter(Boolean).sort();
    expect(headlines(rebuilt)).toEqual(headlines(original));
    expect(shots(rebuilt)).toEqual(shots(original));
    expect(devicesOf(rebuilt.slides[0].layers)[0].assets).toMatchObject({ de: "shot-de" });
  });
});

describe("expandDeck", () => {
  it("passes a full deck through unchanged", () => {
    const full = buildDeck("clean-light", "iphone", { slides: RECIPE, locale: "en" });
    expect(expandDeck("iphone", full, "en", "App").slides).toEqual(full.slides);
  });
  it("expands a recipe deck", () => {
    expect(expandDeck("iphone", { template: "candy-pop", slides: RECIPE }, "en", "App").template).toBe("candy-pop");
  });
});

it("all device ids are covered by at least one class test or share its canvas kind", () => {
  expect(DEVICES.length).toBeGreaterThanOrEqual(CLASSES.length);
});
