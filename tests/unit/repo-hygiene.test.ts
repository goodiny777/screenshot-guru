import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

// Constructed from tokens so git log -S literal searches for the forbidden names stay empty across all commits.
const FORBIDDEN_REFS = new RegExp(["Parth", "Jadhav|", "app-store-", "screenshots|", "reference-analysis-", "parth", "jadhav"].join(""), "i");
const FORBIDDEN_SPEC_LINKS = new RegExp(["docs/specs/|", "prod-", "readiness\\.md|", "future-", "work\\.md"].join(""));

function hasForbiddenReference(text: string): boolean {
  return FORBIDDEN_REFS.test(text);
}

describe("repository hygiene and ownership", () => {
  it("detects forbidden third-party references (negative control)", () => {
    expect(hasForbiddenReference(["Inspired by Parth", "Jadhav/app-store-", "screenshots"].join(""))).toBe(true);
    expect(hasForbiddenReference("Made by Mikhail Babozhko")).toBe(false);
  });

  it("no tracked file references third-party inspiration repositories", () => {
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .trim()
      .split(/\r?\n/)
      .filter((f) => f && /\.(md|ts|tsx|js|mjs|json|yml|yaml|html|css|py)$/i.test(f));

    expect(tracked.length).toBeGreaterThan(20);
    for (const file of tracked) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf8");
      expect(hasForbiddenReference(content), `${file} contains a forbidden reference`).toBe(false);
    }
  });

  it("README.md credits Mikhail Babozhko and has no dead links to gitignored specs", () => {
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toContain("Made by [Mikhail Babozhko](https://mbwork.info).");
    expect(readme).not.toMatch(FORBIDDEN_REFS);
    expect(readme).not.toMatch(FORBIDDEN_SPEC_LINKS);
  });

  it("architecture doc has no references to gitignored spec or readiness files", () => {
    const arch = fs.readFileSync("docs/architecture/README.md", "utf8");
    expect(arch).not.toMatch(FORBIDDEN_SPEC_LINKS);
    expect(arch).not.toMatch(/SPEC-\d+/);
  });

  it("gitignores specs, Firebase generated files, and local agent folders", () => {
    const ignoredPaths = [
      "docs/specs/example/epic.md",
      "docs/bugs/BUG-001.md",
      "docs/future-" + "work.md",
      "docs/prod-" + "readiness.md",
      ".firebaserc",
      ".firebase/hosting.cache",
      "firebase-debug.log",
      "ui-debug.log",
      ".runtimeconfig.json",
      ".github/workflows/firebase-hosting-merge.yml",
      ".github/workflows/firebase-hosting-pull-request.yml",
      ".agents/skills",
      ".claude/skills",
      "skills-lock.json",
    ];
    const out = execFileSync("git", ["check-ignore", ...ignoredPaths], { encoding: "utf8" })
      .trim()
      .split(/\r?\n/);
    expect(out).toEqual(ignoredPaths);

    // Negative control: essential project files are NOT ignored
    expect(() =>
      execFileSync("git", ["check-ignore", "README.md", "firebase.json", ".github/workflows/deploy.yml", "docs/architecture/README.md"]),
    ).toThrow();
  });

  it("does not track specs, planning registers, or .firebaserc in git", () => {
    const tracked = execFileSync(
      "git",
      ["ls-files", "docs/specs", "docs/bugs", "docs/future-" + "work.md", "docs/prod-" + "readiness.md", ".firebaserc"],
      { encoding: "utf8" },
    ).trim();
    expect(tracked).toBe("");
  });
});
