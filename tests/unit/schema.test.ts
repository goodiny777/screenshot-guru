import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEVICES } from "../../src/model/devices";
import { emptyProject } from "../../src/model/defaults";
import { projectSchema } from "../../src/model/schema";
import { STYLES, buildDeck } from "../../src/model/templates";
import { validateProject } from "../../src/model/validateProject";
import { normalizeProject } from "../../src/store/io";

const example = JSON.parse(fs.readFileSync("skills/screenshot-guru/assets/example-project.json", "utf8"));
const PACK = "skills/screenshot-guru/scripts/pack_project.py";

function packErrors(project: unknown): string[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pack-"));
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify(project));
  try {
    execFileSync("python3", [path.resolve(PACK), "project.json", "--out", "x.zip"], { cwd: dir, stdio: "pipe" });
    return [];
  } catch (e) {
    return String((e as { stdout: Buffer }).stdout).split("\n").filter((l) => l.startsWith("error:"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("project schema", () => {
  it("AC-1: the skill's example project is valid", () => {
    expect(validateProject(example)).toEqual([]);
  });

  it("a full-format project, as the editor saves it, is valid", () => {
    const p = emptyProject();
    p.decks.iphone = buildDeck("midnight-glow", "iphone", { slides: [{ headline: "a", screenshot: "x" }, { headline: "b" }], locale: "en" });
    p.decks["feature-graphic"] = buildDeck("candy-pop", "feature-graphic", { locale: "en" });
    expect(validateProject(p)).toEqual([]);
  });

  it("AC-2: a bad layout is rejected by the importer and the pack script at the same JSON path", () => {
    const bad = structuredClone(example);
    bad.decks.iphone.slides[0].layout = "banana";
    const appPaths = validateProject(bad).map((i) => i.path);
    expect(appPaths).toContain("/decks/iphone/slides/0/layout");
    const warnings: string[] = [];
    normalizeProject(bad, warnings);
    expect(warnings.join("\n")).toMatch(/Schema: \/decks\/iphone\/slides\/0\/layout/);
    // the example references images, so missing-file errors appear too; look for the schema one
    expect(packErrors(bad).join("\n")).toMatch(/\/decks\/iphone\/slides\/0\/layout must be one of/);
  });

  it("AC-2 negative: a valid recipe passes both", () => {
    const ok = { schema: "screenshot-guru/1", name: "A", locales: ["en"], decks: { iphone: { template: "clean-light", slides: [{ headline: "Hi" }] } } };
    expect(validateProject(ok)).toEqual([]);
    expect(packErrors(ok)).toEqual([]);
  });

  it("wrong types and unknown keys are reported", () => {
    const bad = { schema: "screenshot-guru/1", decks: { iphone: { template: "clean-light", slides: [{ headline: 5, colour: "red" }] } } };
    const paths = validateProject(bad).map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["/decks/iphone/slides/0/headline", "/decks/iphone/slides/0/colour"]));
  });

  it("AC-3: device and template enums are generated from the app", () => {
    const s = projectSchema();
    expect(s.properties.decks.propertyNames.enum).toEqual(DEVICES.map((d) => d.id));
    expect(s.$defs.recipeDeck.properties.template.enum).toEqual(STYLES.map((t) => t.id));
    expect(s["x-max-slides"]).toEqual(Object.fromEntries(DEVICES.map((d) => [d.id, d.slides.max])));
  });

  it("published copies match the generated schema", () => {
    const generated = JSON.stringify(projectSchema(), null, 2) + "\n";
    expect(fs.readFileSync("public/project.schema.json", "utf8")).toBe(generated);
    expect(fs.readFileSync("skills/screenshot-guru/assets/project.schema.json", "utf8")).toBe(generated);
  });

  it("pack script enforces the store slide limit from the schema", () => {
    const over = { schema: "screenshot-guru/1", name: "A", locales: ["en"], decks: { "feature-graphic": { template: "clean-light", slides: [{ headline: "a" }, { headline: "b" }] } } };
    expect(packErrors(over).join()).toMatch(/2 slides, the store allows 1/);
  });
});

it("live objects with undefined values validate instead of throwing (agent loadProject)", () => {
  const p = { schema: "screenshot-guru/1", name: undefined, decks: { iphone: { template: "clean-light", orientation: undefined, slides: [{ headline: "x", background: undefined }] } } };
  expect(() => validateProject(p)).not.toThrow();
  expect(validateProject(p)).toEqual([]);
});
