// Fails when generated skill files are out of date with the app source.
// Regenerates them, then asks git whether anything changed.
import { execSync } from "node:child_process";

execSync("node scripts/build-skill.mjs", { stdio: "inherit" });
const changed = execSync("git status --porcelain -- skills public/screenshot-guru-skill.zip", { encoding: "utf8" }).trim();
if (changed) {
  console.error("Generated skill files are stale. Run `npm run skill` and commit:\n" + changed);
  process.exit(1);
}
console.log("check-skill-fresh: ok");
