// Project files: a .zip with project.json plus an assets/ folder. This is the
// handoff format the AI skill writes ("recipe" decks are expanded on import).
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { DEVICE_MAP } from "../model/devices";
import { emptyProject } from "../model/defaults";
import { markCustomFont } from "../model/fonts";
import { expandDeck } from "../model/templates";
import type { Project } from "../model/types";
import { getAssetBlob, newAssetId, putAsset, registerFont } from "./assets";

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif",
  ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2",
};
const ext = (p: string) => p.split(".").pop()?.toLowerCase() ?? "";

export type ImportReport = { project: Project; assets: number; warnings: string[] };

/** Replace every string in `obj` that is a key of `map` with its value. */
function remap<T>(obj: T, map: Map<string, string>): T {
  if (typeof obj === "string") return (map.get(obj) ?? obj) as T;
  if (Array.isArray(obj)) return obj.map((v) => remap(v, map)) as T;
  if (obj && typeof obj === "object") return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, remap(v, map)])) as T;
  return obj;
}

/** Turn any accepted JSON (full or recipe) into a valid Project. */
export function normalizeProject(raw: unknown, warnings: string[] = []): Project {
  const src = (raw ?? {}) as Partial<Project> & { decks?: Record<string, unknown> };
  const p = emptyProject();
  p.name = typeof src.name === "string" ? src.name : p.name;
  p.locales = Array.isArray(src.locales) && src.locales.length ? src.locales.map(String) : ["en"];
  p.activeLocale = p.locales.includes(src.activeLocale as string) ? (src.activeLocale as string) : p.locales[0];
  p.icon = typeof src.icon === "string" ? src.icon : undefined;
  p.fonts = src.fonts && typeof src.fonts === "object" ? src.fonts : undefined;
  for (const [id, deck] of Object.entries(src.decks ?? {})) {
    if (!DEVICE_MAP[id]) {
      warnings.push(`Unknown device "${id}" skipped. See the device list in the skill.`);
      continue;
    }
    try {
      p.decks[id] = expandDeck(id, deck, p.locales[0], p.name, p.icon);
    } catch (e) {
      warnings.push(`Could not read deck "${id}": ${(e as Error).message}`);
    }
  }
  if (!Object.keys(p.decks).length) warnings.push("The project has no decks.");
  p.activeDevice = src.activeDevice && p.decks[src.activeDevice] ? src.activeDevice : Object.keys(p.decks)[0] ?? "iphone";
  return p;
}

/** Import a project .zip (or bare project.json). Asset paths are replaced by fresh ids. */
export async function importProjectFile(data: ArrayBuffer | Uint8Array, name = "project.zip"): Promise<ImportReport> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const warnings: string[] = [];
  let json: unknown;
  const map = new Map<string, string>();
  let count = 0;
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) {
    json = JSON.parse(strFromU8(bytes));
  } else {
    const files = unzipSync(bytes);
    // project.json may sit in a top-level folder if the user zipped the folder
    const jsonPath = Object.keys(files).find((p) => /(^|\/)project\.json$/.test(p) && !p.includes("__MACOSX"));
    if (!jsonPath) throw new Error(`${name} has no project.json`);
    const root = jsonPath.slice(0, -"project.json".length);
    json = JSON.parse(strFromU8(files[jsonPath]));
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith("/") || path.includes("__MACOSX") || path === jsonPath) continue;
      const type = MIME[ext(path)];
      if (!type) continue;
      const rel = path.slice(root.length);
      const id = newAssetId(rel.split("/").pop());
      await putAsset(id, new Blob([content as BlobPart], { type }));
      map.set(rel, id);
      map.set(rel.replace(/^assets\//, ""), id);
      map.set("./" + rel, id);
      count++;
    }
  }
  const project = normalizeProject(remap(json, map), warnings);
  // Any string that looks like an asset path but was not in the zip
  const unresolved = new Set<string>();
  JSON.stringify(project, (_k, v) => {
    if (typeof v === "string" && /\.(png|jpe?g|webp|gif|avif)$/i.test(v)) unresolved.add(v);
    return v;
  });
  if (unresolved.size) warnings.push(`Missing image files: ${[...unresolved].slice(0, 8).join(", ")}${unresolved.size > 8 ? "…" : ""}`);
  for (const [family, id] of Object.entries(project.fonts ?? {})) {
    markCustomFont(family);
    if (!(await registerFont(family, id))) warnings.push(`Font "${family}" could not be loaded.`);
  }
  return { project, assets: count, warnings };
}

/** Export the full project with its images, so it can be re-opened or shared. */
export async function exportProjectZip(project: Project): Promise<Blob> {
  const ids = new Set<string>();
  JSON.stringify(project, (k, v) => {
    if ((k === "asset" || k === "icon") && typeof v === "string" && v) ids.add(v);
    if (k === "assets" && v && typeof v === "object") Object.values(v as Record<string, string>).forEach((x) => ids.add(x));
    return v;
  });
  Object.values(project.fonts ?? {}).forEach((id) => ids.add(id));
  const files: Record<string, Uint8Array> = {};
  const map = new Map<string, string>();
  for (const id of ids) {
    const blob = await getAssetBlob(id);
    if (!blob) continue;
    const e = Object.entries(MIME).find(([, m]) => m === blob.type)?.[0] ?? "bin";
    const path = `assets/${id}.${e}`;
    files[path] = new Uint8Array(await blob.arrayBuffer());
    map.set(id, path);
  }
  files["project.json"] = strToU8(JSON.stringify(remap(project, map), null, 2));
  return new Blob([zipSync(files) as BlobPart], { type: "application/zip" });
}

/** Read an image File into the asset store and return its id. */
export async function addImageFile(file: File | Blob, name = "image"): Promise<string> {
  const id = newAssetId((file as File).name ?? name);
  await putAsset(id, file);
  return id;
}
