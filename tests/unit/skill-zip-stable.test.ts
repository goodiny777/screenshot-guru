import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

// Regression (found by the first CI run): zip timestamps are stored in local
// time, so the skill zip must not depend on the machine's time zone.
function buildIn(tz: string) {
  execFileSync("node", ["scripts/build-skill.mjs"], { env: { ...process.env, TZ: tz }, stdio: "pipe" });
  return createHash("sha256").update(fs.readFileSync("public/screenshot-guru-skill.zip")).digest("hex");
}

describe("skill zip", () => {
  it("is byte-identical across time zones", () => {
    const a = buildIn("UTC");
    const b = buildIn("Europe/Berlin");
    const c = buildIn("America/Los_Angeles");
    expect(b).toBe(a);
    expect(c).toBe(a);
  }, 60_000);
});
