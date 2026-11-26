import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Every source module is named in the architecture doc.
const doc = fs.readFileSync("docs/architecture/README.md", "utf8");
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(ts|tsx|mjs)$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
  });
}

describe("architecture doc coverage", () => {
  const modules = [...files("src"), ...files("scripts")].map((p) => p.split(path.sep).join("/"));
  it.each(modules)("names %s", (m) => {
    expect(doc).toContain(m);
  });
  it("the check can fail (negative control)", () => {
    expect(doc.includes("src/model/does-not-exist.ts")).toBe(false);
  });
});

// The user guide covers every top-bar control.
describe("user guide coverage", () => {
  const guide = fs.readFileSync("docs/user-guide.md", "utf8");
  const app = fs.readFileSync("src/ui/App.tsx", "utf8");
  const header = app.slice(app.indexOf("<header"), app.indexOf("</header>"));
  const buttons = [...header.matchAll(/>([A-Z][A-Za-z ]+)(?:<span|<\/button>)/g)].map((m) => m[1].trim());
  it("finds the top-bar buttons", () => {
    expect(buttons).toEqual(expect.arrayContaining(["Templates", "Open", "Save", "New", "Add AI skill", "Export"]));
  });
  it.each(buttons)("explains %s", (b) => {
    expect(guide).toContain(b);
  });
});
