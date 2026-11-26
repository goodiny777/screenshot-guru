import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard for the deploy key: these rules keep a public repo's
// workflows from ever running fork code with secrets.
const dir = ".github/workflows";
const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
const read = (f: string) => fs.readFileSync(path.join(dir, f), "utf8");
/** Workflow text without comment lines (comments may mention forbidden things to warn about them). */
const code = (f: string) => read(f).split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
const PINNED = /uses:\s*[\w.-]+\/[\w.-]+@[0-9a-f]{40}\b/;

describe("GitHub workflows", () => {
  it("only the expected workflows exist (no duplicate deploys)", () => {
    expect(files.sort()).toEqual(["ci.yml", "deploy.yml", "preview.yml"]);
  });

  it.each(files)("%s pins every action to a full commit SHA", (f) => {
    const uses = read(f).split("\n").filter((l) => /^\s*-?\s*uses:/.test(l));
    expect(uses.length).toBeGreaterThan(0);
    uses.forEach((l) => expect(l, l.trim()).toMatch(PINNED));
  });

  it("the pin check rejects a tag (negative control)", () => {
    expect("      - uses: actions/checkout@v4").not.toMatch(PINNED);
  });

  it.each(files)("%s declares top-level permissions and never uses pull_request_target", (f) => {
    const s = code(f);
    expect(s).toMatch(/^permissions:/m);
    expect(s).not.toMatch(/pull_request_target/);
  });

  it("only deploy and preview can read the Firebase key", () => {
    const users = files.filter((f) => read(f).includes("FIREBASE_SERVICE_ACCOUNT"));
    expect(users.sort()).toEqual(["deploy.yml", "preview.yml"]);
  });

  it("live deploy only runs for pushes to main in this repository", () => {
    const s = read("deploy.yml");
    expect(s).toContain("github.event.workflow_run.event == 'push'");
    expect(s).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(s).toContain("github.event.workflow_run.head_repository.full_name == github.repository");
    expect(s).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(s).toContain("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'");
    expect(s).not.toMatch(/repoToken/); // live channel needs no GitHub write token
  });

  it("preview skips pull requests from forks", () => {
    expect(read("preview.yml")).toContain("if: github.event.pull_request.head.repo.full_name == github.repository");
  });

  it("checkouts in secret-bearing jobs do not keep the GitHub token on disk", () => {
    for (const f of ["deploy.yml", "preview.yml"]) expect(read(f)).toContain("persist-credentials: false");
  });
});
