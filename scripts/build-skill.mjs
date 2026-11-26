// Generates the skill's device and template references from the app's source
// (so they never drift), then packs skills/screenshot-guru into public/screenshot-guru-skill.zip.
import { build } from "esbuild";
import { zipSync, strToU8 } from "fflate";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = path.join(root, "skills", "screenshot-guru");
const tmp = path.join(root, "node_modules", ".cache", "skill-gen.mjs");

await build({
  stdin: {
    contents: `export { DEVICES } from "./src/model/devices.ts"; export { STYLES } from "./src/model/templates.ts";`,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmp,
  logLevel: "error",
});
const { DEVICES, STYLES } = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`);

const groups = [...new Set(DEVICES.map((d) => d.group))];
let md = `# Devices and store sizes

Generated from the app. Use the **id** as the key under \`decks\` in project.json.
The design canvas is what layer coordinates refer to. Export renders every listed size.

`;
for (const g of groups) {
  md += `## ${g}\n\n| id | Label | Design canvas | Export sizes | Max slides | Rotatable |\n|---|---|---|---|---|---|\n`;
  for (const d of DEVICES.filter((x) => x.group === g)) {
    md += `| \`${d.id}\` | ${d.label} | ${d.canvas.w}×${d.canvas.h} | ${d.sizes.map((s) => `${s.w}×${s.h}${s.required ? " (required)" : ""}`).join(", ")} | ${d.slides.max} | ${d.rotatable ? "yes" : "no"} |\n`;
  }
  md += "\n";
}
md += `## Store rules per device\n\n`;
for (const d of DEVICES) {
  md += `### ${d.label} (\`${d.id}\`)\n\n${d.rules.map((r) => `- ${r}`).join("\n")}\n`;
  if (d.safe) md += `- Safe area: ${d.safe.note}\n`;
  if (d.noText) md += `- **No added text allowed.** Use only \`screenshot\` in recipe slides.\n`;
  md += "\n";
}
fs.writeFileSync(path.join(skillDir, "references", "devices.md"), md);

let tm = `# Templates

Generated from the app. Use the **id** as \`template\` in a recipe deck. Each template has a default
layout sequence that is used when a slide does not set \`layout\`.

| id | Name | Look | Default layouts | Font |
|---|---|---|---|---|
`;
for (const s of STYLES) tm += `| \`${s.id}\` | ${s.name} | ${s.description} | ${s.sequence.join(", ")} | ${s.font} |\n`;
tm += `
## Picking a template

- Match the app category: finance/productivity → clean-light, swiss-bold, midnight-glow; wellness/lifestyle → paper-japandi, pastel-dream; social/fun → candy-pop, vivid-gradient; fitness/sport → neon-night; creative/photo → editorial-serif, aurora-glass; anything with a strong brand gradient → panorama or ocean-tilt.
- \`panorama\` and \`aurora-glass\` draw one background across all slides; use \`span\` layouts so a device crosses into the next slide.
- Override colours with \`style\`: \`{ "accent": "#ff3b6b", "textColor": "#111", "frameColor": "#f5f5f7", "font": "Poppins", "background": { ... } }\`.
`;
fs.writeFileSync(path.join(skillDir, "references", "templates.md"), tm);

// Pack: the zip's top level must be the skill folder itself.
const files = {};
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (!f.startsWith(".")) files[path.relative(path.join(root, "skills"), p).split(path.sep).join("/")] = new Uint8Array(fs.readFileSync(p));
  }
};
walk(skillDir);
fs.mkdirSync(path.join(root, "public"), { recursive: true });
// fixed timestamps keep the zip byte-identical between builds (CI freshness check)
const fixed = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { mtime: new Date("2026-01-01T00:00:00Z") }]]));
fs.writeFileSync(path.join(root, "public", "screenshot-guru-skill.zip"), zipSync(fixed));
fs.writeFileSync(path.join(root, "public", "skill-version.json"), JSON.stringify({ files: Object.keys(files), built: new Date().toISOString() }, null, 2));
console.log(`skill: ${Object.keys(files).length} files packed into public/screenshot-guru-skill.zip`);
void strToU8;
