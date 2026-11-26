import { describe, expect, it } from "vitest";
import { emptyProject, newDevice, newText } from "../../src/model/defaults";
import { buildDeck } from "../../src/model/templates";
import type { Project } from "../../src/model/types";
import { validate } from "../../src/render/export";

// Paired tests (VR-05): each rule fires on a bad deck and stays silent on a clean one.
function project(build: (p: Project) => void): Project {
  const p = emptyProject();
  build(p);
  return p;
}
const clean = () =>
  project((p) => {
    p.decks.iphone = buildDeck("clean-light", "iphone", { slides: [{ headline: "Build **habits**", screenshot: "a" }, { headline: "Track **streaks**", screenshot: "b" }], locale: "en" });
  });
const msgs = (p: Project, level?: string) => validate(p).filter((w) => !level || w.level === level).map((w) => w.message);

describe("validate", () => {
  it("clean deck has no errors or warnings", () => {
    expect(validate(clean()).filter((w) => w.level !== "tip")).toEqual([]);
  });

  it("slide limit: error above max, silent at max", () => {
    const over = project((p) => { p.decks["feature-graphic"] = buildDeck("clean-light", "feature-graphic", { slides: [{ headline: "a" }, { headline: "b" }], locale: "en" }); });
    expect(msgs(over, "error").join()).toMatch(/2 slides, the store allows 1/);
    const ok = project((p) => { p.decks["feature-graphic"] = buildDeck("clean-light", "feature-graphic", { slides: [{ headline: "a" }], locale: "en" }); });
    expect(msgs(ok, "error")).toEqual([]);
  });

  it("Wear OS: text is an error, plain screenshot is fine (epic AC-3)", () => {
    const bad = project((p) => {
      p.decks["wear-os"] = buildDeck("clean-light", "wear-os", { slides: [{ screenshot: "a" }], locale: "en" });
      p.decks["wear-os"].slides[0].layers.push(newText("Hi", "en"));
    });
    expect(msgs(bad, "error").join()).toMatch(/does not allow added text/);
    const good = project((p) => { p.decks["wear-os"] = buildDeck("clean-light", "wear-os", { slides: [{ screenshot: "a" }], locale: "en" }); });
    expect(msgs(good, "error")).toEqual([]);
  });

  it("Wear OS: a device frame is an error", () => {
    const bad = project((p) => {
      p.decks["wear-os"] = buildDeck("clean-light", "wear-os", { slides: [{ screenshot: "a" }], locale: "en" });
      p.decks["wear-os"].slides[0].layers.push(newDevice("wear-os", 1080, 1080, { frame: "watch-round", asset: "a" }));
    });
    expect(msgs(bad, "error").join()).toMatch(/does not allow device frames/);
  });

  it("missing screenshot warns, filled one does not", () => {
    const bad = project((p) => { p.decks.iphone = buildDeck("clean-light", "iphone", { slides: [{ headline: "x" }, { headline: "y", screenshot: "b" }], locale: "en" }); });
    expect(msgs(bad, "warn").filter((m) => /no screenshot/.test(m))).toHaveLength(1);
    expect(msgs(clean(), "warn").filter((m) => /no screenshot/.test(m))).toHaveLength(0);
  });

  it("low contrast warns, high contrast does not", () => {
    const bad = clean();
    const t = bad.decks.iphone.slides[0].layers.find((l) => l.type === "text")!;
    if (t.type === "text") t.fill = { type: "solid", color: "#eef0f6" };
    expect(msgs(bad, "warn").join()).toMatch(/low text contrast/);
    expect(msgs(clean(), "warn").join()).not.toMatch(/low text contrast/);
  });

  it("long headline is a tip, short one is not", () => {
    const bad = clean();
    const h = bad.decks.iphone.slides[0].layers.find((l) => l.type === "text" && l.name === "Headline")!;
    if (h.type === "text") h.text.en = "This headline has far too many words for anyone to read in search";
    expect(msgs(bad, "tip").join()).toMatch(/headline has 13 words/);
    expect(msgs(clean(), "tip").join()).not.toMatch(/words/);
  });

  it("text in a safe area warns, text inside does not", () => {
    const bad = project((p) => {
      p.decks["event-details"] = buildDeck("clean-light", "event-details", { slides: [{ headline: "x" }], locale: "en" });
      p.decks["event-details"].slides[0].layers = [newText("Bottom", "en", { x: 100, y: 1700, w: 800, h: 150, fill: { type: "solid", color: "#111827" } })];
    });
    expect(msgs(bad, "warn").join()).toMatch(/crops or covers/);
    const good = project((p) => {
      p.decks["event-details"] = buildDeck("clean-light", "event-details", { slides: [{ headline: "x" }], locale: "en" });
      p.decks["event-details"].slides[0].layers = [newText("Top", "en", { x: 100, y: 200, w: 800, h: 150, fill: { type: "solid", color: "#111827" } })];
    });
    expect(msgs(good, "warn").join()).not.toMatch(/crops or covers/);
  });

  it("missing translation is reported once per deck and locale, not when translated", () => {
    const bad = clean();
    bad.locales = ["en", "de"];
    expect(msgs(bad, "tip").filter((m) => /no de translation/.test(m))).toHaveLength(1);
    const good = clean();
    good.locales = ["en", "de"];
    good.decks.iphone.slides.forEach((s) => s.layers.forEach((l) => { if (l.type === "text") l.text.de = "x"; }));
    expect(msgs(good, "tip").filter((m) => /translation/.test(m))).toHaveLength(0);
  });

  it("Android phone with one slide warns (Play needs 2)", () => {
    const bad = project((p) => { p.decks["android-phone"] = buildDeck("clean-light", "android-phone", { slides: [{ headline: "x", screenshot: "a" }], locale: "en" }); });
    expect(msgs(bad, "warn").join()).toMatch(/at least 2/);
    const good = project((p) => { p.decks["android-phone"] = buildDeck("clean-light", "android-phone", { slides: [{ headline: "x", screenshot: "a" }, { headline: "y", screenshot: "b" }], locale: "en" }); });
    expect(msgs(good, "warn").join()).not.toMatch(/at least 2/);
  });
});
