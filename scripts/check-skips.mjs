// VR-16 gate: a skipped test must say why with "blocked by BUG-NNN".
// Usage: node scripts/check-skips.mjs [dir ...]   (default: tests)
import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ["tests"];
const SKIP = /\b(?:it|test|describe)(?:\.\w+)*\.(?:skip|fixme|todo)\s*\(|\b(?:xit|xdescribe|xtest)\s*\(/;
const REF = /blocked by BUG-\d{3,}/;
const bad = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "generated") walk(p);
    } else if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
      fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        if (SKIP.test(line) && !REF.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
      });
    }
  }
}
roots.forEach(walk);
if (bad.length) {
  console.error("Skipped tests without a 'blocked by BUG-NNN' reference:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("check-skips: ok");
