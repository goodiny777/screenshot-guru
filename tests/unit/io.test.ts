import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { importProjectFile, normalizeProject } from "../../src/store/io";

describe("normalizeProject", () => {
  it("skips unknown devices with a warning and keeps the rest", () => {
    const w: string[] = [];
    const p = normalizeProject({ name: "A", locales: ["en"], decks: { toaster: { template: "clean-light", slides: [{}] }, iphone: { template: "clean-light", slides: [{ headline: "x" }] } } }, w);
    expect(Object.keys(p.decks)).toEqual(["iphone"]);
    expect(w.join()).toMatch(/Unknown device "toaster"/);
  });
  it("defaults locales and name, warns on no decks", () => {
    const w: string[] = [];
    const p = normalizeProject({}, w);
    expect(p.locales).toEqual(["en"]);
    expect(p.name).toBe("My App");
    expect(w.join()).toMatch(/no decks/);
  });
  it("activeLocale must be one of the locales", () => {
    const p = normalizeProject({ locales: ["de", "en"], activeLocale: "fr", decks: { iphone: { template: "clean-light", slides: [{}] } } });
    expect(p.activeLocale).toBe("de");
  });
});

describe("importProjectFile (zip)", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // header only; decoding is not needed for remapping
  const project = { schema: "screenshot-guru/1", name: "Z", locales: ["en"], decks: { iphone: { template: "clean-light", slides: [{ headline: "x", screenshot: "assets/a.png" }, { headline: "y", screenshot: "assets/missing.png" }] } } };

  it("remaps asset paths to new ids and lists missing files", async () => {
    const zip = zipSync({ "project.json": strToU8(JSON.stringify(project)), "assets/a.png": png });
    const r = await importProjectFile(zip);
    expect(r.assets).toBe(1);
    const shots = r.project.decks.iphone.slides.flatMap((s) => s.layers.filter((l) => l.type === "device").map((l) => (l as { asset: string }).asset));
    expect(shots[0]).toMatch(/^a-[a-z0-9]{5}$/);
    expect(shots[0]).not.toBe("assets/a.png");
    expect(r.warnings.join()).toMatch(/Missing image files: assets\/missing\.png/);
  });

  it("finds project.json inside a top-level folder", async () => {
    const zip = zipSync({ "Habitly/project.json": strToU8(JSON.stringify(project)), "Habitly/assets/a.png": png });
    const r = await importProjectFile(zip);
    expect(r.assets).toBe(1);
  });

  it("fails clearly without project.json", async () => {
    const zip = zipSync({ "readme.txt": strToU8("hi") });
    await expect(importProjectFile(zip, "x.zip")).rejects.toThrow(/x\.zip has no project\.json/);
  });

  it("accepts bare JSON", async () => {
    const r = await importProjectFile(strToU8(JSON.stringify(project)));
    expect(Object.keys(r.project.decks)).toEqual(["iphone"]);
  });
});
