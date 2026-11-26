// Live smoke for a deployed site (VR-13). Checks each step and exits non-zero on the first failure.
// Usage: node scripts/smoke.mjs https://screenshot-guru-11436.web.app
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https:\/\//.test(base)) {
  console.error("smoke: pass the https URL of the deployed site");
  process.exit(2);
}
const fail = (msg) => { console.error(`smoke: FAIL ${msg}`); process.exit(1); };

const home = await fetch(base + "/");
if (home.status !== 200) fail(`/ returned ${home.status}`);
const html = await home.text();
if (!html.includes('<div id="root">')) fail("/ does not contain the app root");
const csp = home.headers.get("content-security-policy") ?? "";
if (!csp.includes("default-src 'self'")) fail("CSP header missing on /");
const script = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
if (!script) fail("no module script in index.html");
const js = await fetch(base + script);
if (js.status !== 200) fail(`${script} returned ${js.status}`);
if (!(js.headers.get("cache-control") ?? "").includes("immutable")) fail(`${script} is not cached immutable`);
if (!(await js.text()).includes("screenshotGuru")) fail("bundle does not contain the agent API");

const zip = await fetch(base + "/screenshot-guru-skill.zip");
if (zip.status !== 200) fail(`skill zip returned ${zip.status}`);
const bytes = Buffer.from(await zip.arrayBuffer());
if (bytes.subarray(0, 2).toString() !== "PK") fail("skill zip is not a zip");
if (!bytes.includes(Buffer.from("screenshot-guru/SKILL.md"))) fail("skill zip has no screenshot-guru/SKILL.md");

console.log(`smoke: ok ${base} (bundle ${script}, skill zip ${bytes.length} bytes)`);
