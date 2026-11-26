// Image and font assets live in IndexedDB as Blobs, keyed by id. Decoded images
// are cached in memory for drawing. The project JSON only stores the ids.
import { createStore, get, set, del, keys } from "idb-keyval";

const db = createStore("screenshot-guru", "assets");

type Entry = { img: HTMLImageElement; w: number; h: number; type: string };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry | null>>();
const listeners = new Set<() => void>();

export function onAssetsChanged(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
const notify = () => listeners.forEach((f) => f());

function decode(blob: Blob): Promise<Entry> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      img.decode().catch(() => undefined).finally(() =>
        resolve({ img, w: img.naturalWidth, h: img.naturalHeight, type: blob.type }));
    };
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = url;
  });
}

export function getAsset(id: string | undefined): Entry | undefined {
  if (!id) return undefined;
  const hit = cache.get(id);
  if (hit) return hit;
  void loadAsset(id);
  return undefined;
}

export function loadAsset(id: string): Promise<Entry | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!);
  if (pending.has(id)) return pending.get(id)!;
  const p = (async () => {
    const blob = (await get(id, db)) as Blob | undefined;
    if (!blob || blob.type.startsWith("font/") || blob.type.includes("font")) return null;
    try {
      const e = await decode(blob);
      cache.set(id, e);
      notify();
      return e;
    } catch {
      return null;
    }
  })();
  pending.set(id, p);
  p.finally(() => pending.delete(id));
  return p;
}

/** Make sure every id is decoded before an export starts. Returns ids that failed. */
export async function preloadAssets(ids: string[]): Promise<string[]> {
  const results = await Promise.all(ids.map(async (id) => [id, await loadAsset(id)] as const));
  return results.filter(([, e]) => !e).map(([id]) => id);
}

export function newAssetId(name = "img") {
  const base = name.replace(/\.[a-z0-9]+$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "img";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function putAsset(id: string, blob: Blob) {
  await set(id, blob, db);
  cache.delete(id);
  if (!blob.type.includes("font")) await loadAsset(id);
  notify();
  return id;
}

export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  return (await get(id, db)) as Blob | undefined;
}

export async function deleteAsset(id: string) {
  await del(id, db);
  cache.delete(id);
  notify();
}

export async function allAssetIds(): Promise<string[]> {
  return (await keys(db)) as string[];
}

/** Register an uploaded font file with the browser. */
export async function registerFont(family: string, id: string) {
  const blob = await getAssetBlob(id);
  if (!blob) return false;
  try {
    const face = new FontFace(family, await blob.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    notify();
    return true;
  } catch {
    return false;
  }
}

export function assetSize(id: string) {
  const e = cache.get(id);
  return e ? { w: e.w, h: e.h } : null;
}
