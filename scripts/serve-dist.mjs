// Serves dist/ with the headers from firebase.json, so e2e tests see the same
// Content-Security-Policy as production. Usage: node scripts/serve-dist.mjs [port]
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const port = Number(process.argv[2] ?? 4174);
const root = path.resolve("dist");
const { hosting } = JSON.parse(fs.readFileSync("firebase.json", "utf8"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".zip": "application/zip", ".json": "application/json" };

// Firebase glob subset: "**" matches anything, "*" matches within a segment.
const toRe = (glob) => new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "@@ANY@@").replace(/\*/g, "[^/]*").replace(/@@ANY@@/g, ".*") + "$");

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let file = path.join(root, url);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
  const served = "/" + path.relative(root, file).split(path.sep).join("/");
  for (const rule of hosting.headers) if (toRe(rule.source).test(served) || toRe(rule.source).test(url)) for (const h of rule.headers) res.setHeader(h.key, h.value);
  res.setHeader("Content-Type", TYPES[path.extname(file)] ?? "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serve-dist on http://localhost:${port}`));
