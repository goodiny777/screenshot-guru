import { describe, expect, it } from "vitest";
import { isRtlText, visualRuns } from "../../src/render/text";

/** Tokenise like the layout does: words and spaces are separate runs. */
const tokens = (s: string) =>
  s.split("**").flatMap((part, i) => part.split(/(\s+)/).filter(Boolean).map((text) => ({ text, hl: i % 2 === 1 })));
const visual = (s: string) => visualRuns(tokens(s)).map((r) => r.text);

describe("isRtlText", () => {
  it("is true for Hebrew and Arabic", () => {
    expect(isRtlText("שלום עולם", "he")).toBe(true);
    expect(isRtlText("مرحبا", "ar")).toBe(true);
  });
  it("stays true for a Hebrew line that starts with a Latin name", () => {
    expect(isRtlText("Habitly המפה שלך", "he")).toBe(true);
    expect(isRtlText("Habitly המפה שלך", "iw-IL")).toBe(true);
  });
  it("is false for English, Russian and Ukrainian", () => {
    expect(isRtlText("Your world map", "en")).toBe(false);
    expect(isRtlText("Твоя карта мира", "ru")).toBe(false);
    expect(isRtlText("Твоя карта світу", "uk")).toBe(false);
  });
  it("is false for English fallback text shown in a Hebrew locale", () => {
    expect(isRtlText("Your world map", "he")).toBe(false);
  });
  it("follows the first strong letter when the locale is left-to-right", () => {
    expect(isRtlText("עברית in the middle", "en")).toBe(true);
    expect(isRtlText("The word עברית", "en")).toBe(false);
  });
});

describe("visualRuns (left-to-right drawing order for a right-to-left line)", () => {
  it("reverses Hebrew words", () => {
    expect(visual("אחת שתיים שלוש")).toEqual(["שלוש", " ", "שתיים", " ", "אחת"]);
  });
  it("keeps the highlight on its own word", () => {
    const out = visualRuns(tokens("אחת **שתיים**"));
    expect(out[0]).toMatchObject({ text: "שתיים", hl: true, dir: "rtl" });
  });
  it("keeps a two-word Latin name in reading order", () => {
    expect(visual("גלו את Habitly Pro עכשיו")).toEqual(["עכשיו", " ", "Habitly", " ", "Pro", " ", "את", " ", "גלו"]);
  });
  it("marks Latin words left-to-right", () => {
    const run = visualRuns(tokens("את Habitly")).find((r) => r.text === "Habitly")!;
    expect(run.dir).toBe("ltr");
  });
  it("keeps a number that follows a Latin word on its right", () => {
    expect(visual("על iPhone 15 שלך")).toEqual(["שלך", " ", "iPhone", " ", "15", " ", "על"]);
  });
  it("moves punctuation after a final Latin word to the far left", () => {
    expect(visual("נסו Habitly?")).toEqual(["?", "Habitly", " ", "נסו"]);
  });
  it("places a standalone number by Hebrew reading order", () => {
    expect(visual("27 תגים")).toEqual(["תגים", " ", "27"]);
  });
});
