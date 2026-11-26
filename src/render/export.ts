// Store-ready export. Everything runs in the browser: render each slide to a
// canvas at the exact store size, encode opaque PNG (24-bit, no alpha) or JPEG,
// and zip the lot.
import { encode as encodePng } from "fast-png";
import { zipSync } from "fflate";
import { canvasFor, getDevice, sizesFor, type Size } from "../model/devices";
import { ensureFonts } from "../model/fonts";
import type { Deck, Project } from "../model/types";
import { preloadAssets } from "../store/assets";
import { contrast, paintColor } from "./paint";
import { deckAssets, localizedText, renderDeck } from "./renderer";

export type Format = "png" | "jpeg";

/** Render one slide at an exact pixel size. Slight aspect differences are covered (centre crop). */
export function renderSlide(project: Project, deck: Deck, index: number, size: { w: number; h: number }, locale: string): HTMLCanvasElement {
  const { w: W, h: H } = canvasFor(deck.device, deck.orientation);
  const c = document.createElement("canvas");
  c.width = size.w;
  c.height = size.h;
  const ctx = c.getContext("2d", { alpha: false })!;
  ctx.imageSmoothingQuality = "high";
  const s = Math.max(size.w / W, size.h / H);
  ctx.setTransform(s, 0, 0, s, (size.w - W * s) / 2 - index * W * s, (size.h - H * s) / 2);
  renderDeck(ctx, deck, { locale, fallbackLocale: project.locales[0] ?? "en", slideW: W, slideH: H, from: index, to: index });
  return c;
}

export async function encodeCanvas(c: HTMLCanvasElement, format: Format): Promise<Uint8Array> {
  if (format === "jpeg") {
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("JPEG encode failed"))), "image/jpeg", 0.92));
    return new Uint8Array(await blob.arrayBuffer());
  }
  const ctx = c.getContext("2d")!;
  const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
  // Drop the alpha channel: both stores reject transparency, and Apple rejects alpha channels.
  const rgb = new Uint8Array(c.width * c.height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }
  return encodePng({ width: c.width, height: c.height, data: rgb, channels: 3, depth: 8 });
}

/** Load every font face and image a set of decks needs. Returns missing asset ids. */
export async function prepare(project: Project, decks: Deck[], locales: string[]) {
  const specs: { font: string; weight: number; italic?: boolean; text?: string }[] = [];
  for (const d of decks)
    for (const s of d.slides)
      for (const l of s.layers)
        if (l.type === "text")
          for (const loc of locales) specs.push({ font: l.font, weight: l.weight, italic: l.italic, text: localizedText(l.text, loc, project.locales[0]).replace(/\*\*/g, "") });
  await ensureFonts(specs);
  const ids = new Set<string>();
  decks.forEach((d) => deckAssets(d).forEach((id) => ids.add(id)));
  if (project.icon) ids.add(project.icon);
  return preloadAssets([...ids]);
}

export type ExportJob = {
  devices: string[];
  /** device id -> chosen size labels; missing means all sizes. */
  sizes?: Record<string, string[]>;
  locales: string[];
  format: Format;
};

export type Oversize = { path: string; bytes: number; max: number; device: string };
export type ExportResult = { zip: Blob; files: number; missing: string[]; oversize: Oversize[] };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function exportBundle(project: Project, job: ExportJob, onProgress?: (done: number, total: number, file: string) => void): Promise<ExportResult> {
  const decks = job.devices.map((id) => project.decks[id]).filter(Boolean) as Deck[];
  const missing = await prepare(project, decks, job.locales);
  const plan: { deck: Deck; size: Size; locale: string; index: number; path: string }[] = [];
  for (const deck of decks) {
    const dev = getDevice(deck.device);
    const wanted = job.sizes?.[deck.device];
    const sizes = sizesFor(deck.device, deck.orientation).filter((s) => !wanted || wanted.includes(s.label));
    for (const size of sizes)
      for (const locale of job.locales)
        deck.slides.forEach((_, index) => {
          const ext = job.format === "jpeg" ? "jpg" : "png";
          const store = dev.store === "apple" ? "app-store" : dev.store === "google" ? "google-play" : "promo";
          plan.push({ deck, size, locale, index, path: `${store}/${slug(dev.label)}/${size.w}x${size.h}/${locale}/${String(index + 1).padStart(2, "0")}.${ext}` });
        });
  }
  const files: Record<string, Uint8Array> = {};
  const oversize: Oversize[] = [];
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    onProgress?.(i, plan.length, p.path);
    const canvas = renderSlide(project, p.deck, p.index, p.size, p.locale);
    files[p.path] = await encodeCanvas(canvas, job.format);
    const max = getDevice(p.deck.device).maxBytes;
    if (max && files[p.path].length > max) oversize.push({ path: p.path, bytes: files[p.path].length, max, device: p.deck.device });
    // let the UI breathe between big renders
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress?.(plan.length, plan.length, "zip");
  const zipped = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { level: 0 }]])) as never);
  return { zip: new Blob([zipped as BlobPart], { type: "application/zip" }), files: plan.length, missing, oversize };
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------------------
// Store-rule checks

export type Warning = { device: string; slide?: number; level: "error" | "warn" | "tip"; message: string };

export function validate(project: Project): Warning[] {
  const out: Warning[] = [];
  for (const deck of Object.values(project.decks)) {
    const dev = getDevice(deck.device);
    const { w: W, h: H } = canvasFor(deck.device, deck.orientation);
    if (deck.slides.length > dev.slides.max)
      out.push({ device: dev.id, level: "error", message: `${dev.label}: ${deck.slides.length} slides, the store allows ${dev.slides.max}.` });
    if (dev.store === "google" && dev.id === "android-phone" && deck.slides.length < 2)
      out.push({ device: dev.id, level: "warn", message: "Google Play needs at least 2 phone screenshots." });
    deck.slides.forEach((slide, i) => {
      const bg = paintColor((slide.background ?? deck.background).paint);
      for (const l of slide.layers) {
        if (l.hidden) continue;
        if (l.type === "device" && !l.asset)
          out.push({ device: dev.id, slide: i, level: "warn", message: `${dev.label} slide ${i + 1}: a device has no screenshot.` });
        if (dev.noText && l.type === "text")
          out.push({ device: dev.id, slide: i, level: "error", message: `${dev.label} slide ${i + 1}: the store does not allow added text here.` });
        if (dev.noFrame && l.type === "device" && l.frame !== "none")
          out.push({ device: dev.id, slide: i, level: "error", message: `${dev.label} slide ${i + 1}: the store does not allow device frames here.` });
        if (l.type === "text") {
          const fg = paintColor(l.fill);
          const ratio = contrast(fg, bg);
          if (ratio < 3 && !deck.spanBackground)
            out.push({ device: dev.id, slide: i, level: "warn", message: `${dev.label} slide ${i + 1}: low text contrast (${ratio.toFixed(1)}:1). Aim for at least 3:1.` });
          const words = localizedText(l.text, project.locales[0], project.locales[0]).replace(/\*\*/g, "").split(/\s+/).filter(Boolean).length;
          if (l.name === "Headline" && words > 9)
            out.push({ device: dev.id, slide: i, level: "tip", message: `${dev.label} slide ${i + 1}: headline has ${words} words. 3–7 words read best in search results.` });
          if (l.size < Math.min(W, H) * 0.03)
            out.push({ device: dev.id, slide: i, level: "tip", message: `${dev.label} slide ${i + 1}: some text may be too small to read on a phone.` });
          if (dev.safe) {
            const s = dev.safe;
            const out1 = (s.left && l.x < s.left) || (s.right && l.x + l.w > W - s.right) || (s.top && l.y < s.top) || (s.bottom && l.y + l.h > H - s.bottom);
            if (out1) out.push({ device: dev.id, slide: i, level: "warn", message: `${dev.label} slide ${i + 1}: text is inside an area the store crops or covers. ${s.note}` });
          }
        }
      }
    });
    for (const loc of project.locales.slice(1)) {
      let missing = 0;
      deck.slides.forEach((slide) => slide.layers.forEach((l) => { if (l.type === "text" && !l.hidden && !l.text[loc]) missing++; }));
      if (missing)
        out.push({ device: dev.id, level: "tip", message: `${dev.label}: ${missing} text layer(s) have no ${loc} translation and will show the ${project.locales[0]} text.` });
    }
  }
  return out;
}
