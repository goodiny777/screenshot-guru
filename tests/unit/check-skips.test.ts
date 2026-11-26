import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Paired tests for the VR-16 skip gate: it must fail on an unreferenced skip
// and pass on a referenced one.
const dirs: string[] = [];
// Built from parts so this file does not trip the gate it tests.
const SKIP = ["test", "skip"].join(".");
function run(content: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skips-"));
  dirs.push(dir);
  fs.writeFileSync(path.join(dir, "x.spec.ts"), content);
  try {
    execFileSync("node", ["scripts/check-skips.mjs", dir], { stdio: "pipe" });
    return 0;
  } catch (e) {
    return (e as { status: number }).status;
  }
}
afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

describe("check-skips gate", () => {
  it("fails on a skip without a BUG reference", () => {
    expect(run(`${SKIP}("flaky", () => {});`)).toBe(1);
  });
  it("passes on a skip that names its BUG", () => {
    expect(run(`${SKIP}("export race - blocked by BUG-001", () => {});`)).toBe(0);
  });
  it("passes on a file with no skips", () => {
    expect(run('test("ok", () => {});')).toBe(0);
  });
});
