// window.screenshotGuru — a small JavaScript API for AI agents that can drive a
// browser (Claude in Chrome, Antigravity browser agent, Playwright...). It works
// on the same project as the UI, so the user watches the changes happen.
import { DEVICES, getDevice, sizesFor } from "../model/devices";
import { STYLES, buildDeck, restyleDeck } from "../model/templates";
import type { Layer, Project, RecipeDeck } from "../model/types";
import { exportBundle, prepare, renderSlide, validate, download, encodeCanvas, type ExportJob } from "../render/export";
import { newAssetId, putAsset } from "../store/assets";
import { exportProjectZip, importProjectFile, normalizeProject } from "../store/io";
import { getState, replaceProject, update, setUi, select, activeDeck } from "../store/store";

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/png";
  const bin = head.includes("base64") ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function deckOrThrow(device?: string) {
  const p = getState().project;
  const id = device ?? p.activeDevice;
  const deck = p.decks[id];
  if (!deck) throw new Error(`No deck for "${id}". Call addDeck("${id}", template) first. Existing: ${Object.keys(p.decks).join(", ")}`);
  return { p, id, deck };
}

const api = {
  version: "1.0.0",

  help() {
    return [
      "screenshotGuru API — every method is sync unless marked async.",
      "getProject() -> Project JSON",
      "async loadProject(json) — full or recipe format (see the skill's project-format reference)",
      "async loadProjectZip(urlOrBase64) — same zip the skill packs",
      "async addAsset(id?, dataUrlOrUrl) -> asset id to use in layers / recipe screenshots",
      "listDevices(), listTemplates()",
      "addDeck(device, template, {slides, orientation, style}) — build a deck from a template (recipe slides optional)",
      "restyle(device, template) — keep layout and copy, change the look",
      "setDevice(device), setLocale(locale), addLocale(locale)",
      "getDeck(device?) -> deck JSON (slides with layers)",
      "updateLayer(device, slideIndex, layerId, patch) / addLayer(device, slideIndex, layer) / removeLayer(device, slideIndex, layerId)",
      "setText(device, slideIndex, layerName, text, locale?) — set 'Headline', 'Label' or 'Subline' text",
      "setScreenshot(device, slideIndex, assetId, which=0)",
      "addSlide(device, recipeSlide?) / removeSlide(device, index) / moveSlide(device, from, to)",
      "validate() -> store-rule warnings",
      "async renderSlide(device, index, {width?, locale?, format?}) -> data URL (to look at your work)",
      "async exportZip({devices?, locales?, format?, sizes?, download?}) -> {files, missing, base64?}",
      "async saveProjectZip(download=true) -> base64 of the project zip",
    ].join("\n");
  },

  getProject(): Project {
    return structuredClone(getState().project);
  },

  async loadProject(json: unknown) {
    const warnings: string[] = [];
    const p = normalizeProject(typeof json === "string" ? JSON.parse(json) : json, warnings);
    replaceProject(p);
    return { ok: true, devices: Object.keys(p.decks), warnings };
  },

  async loadProjectZip(src: string) {
    let bytes: Uint8Array;
    if (/^https?:|^\//.test(src)) bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
    else {
      const b64 = src.includes(",") ? src.split(",")[1] : src;
      const bin = atob(b64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    }
    const r = await importProjectFile(bytes);
    replaceProject(r.project);
    return { ok: true, assets: r.assets, devices: Object.keys(r.project.decks), warnings: r.warnings };
  },

  async addAsset(id: string | undefined, src: string) {
    const blob = src.startsWith("data:") ? dataUrlToBlob(src) : await (await fetch(src)).blob();
    const assetId = id || newAssetId("asset");
    await putAsset(assetId, blob);
    return assetId;
  },

  listDevices() {
    return DEVICES.map((d) => ({ id: d.id, label: d.label, store: d.store, canvas: d.canvas, rotatable: !!d.rotatable, sizes: d.sizes.map((s) => `${s.w}x${s.h}`), maxSlides: d.slides.max, rules: d.rules }));
  },

  listTemplates() {
    return STYLES.map((s) => ({ id: s.id, name: s.name, description: s.description }));
  },

  addDeck(device: string, template = "clean-light", opts: Partial<RecipeDeck> = {}) {
    getDevice(device);
    update((p) => {
      p.decks[device] = buildDeck(template, device, { orientation: opts.orientation, slides: opts.slides, style: opts.style, locale: p.locales[0], appName: p.name, icon: p.icon });
      p.activeDevice = device;
    });
    return api.getDeck(device);
  },

  restyle(device: string, template: string) {
    const { id, deck } = deckOrThrow(device);
    update((p) => { p.decks[id] = restyleDeck(deck, template); });
    return true;
  },

  setDevice(device: string) {
    deckOrThrow(device);
    update((p) => { p.activeDevice = device; }, "ui");
    return true;
  },

  setLocale(locale: string) {
    update((p) => {
      if (!p.locales.includes(locale)) p.locales.push(locale);
      p.activeLocale = locale;
    }, "ui");
    return true;
  },

  addLocale(locale: string) {
    update((p) => { if (!p.locales.includes(locale)) p.locales.push(locale); });
    return getState().project.locales;
  },

  getDeck(device?: string) {
    return structuredClone(deckOrThrow(device).deck);
  },

  updateLayer(device: string, slide: number, layerId: string, patch: Partial<Layer>) {
    const { id } = deckOrThrow(device);
    let found = false;
    update((p) => {
      const l = p.decks[id].slides[slide]?.layers.find((x) => x.id === layerId);
      if (l) { Object.assign(l, patch); found = true; }
    });
    if (!found) throw new Error(`Layer ${layerId} not found on slide ${slide}`);
    return true;
  },

  addLayer(device: string, slide: number, layer: Layer) {
    const { id } = deckOrThrow(device);
    const l = { ...layer, id: layer.id || `l_${Math.random().toString(36).slice(2, 9)}` };
    update((p) => { p.decks[id].slides[slide].layers.push(l as Layer); });
    return l.id;
  },

  removeLayer(device: string, slide: number, layerId: string) {
    const { id } = deckOrThrow(device);
    update((p) => {
      const s = p.decks[id].slides[slide];
      s.layers = s.layers.filter((l) => l.id !== layerId);
    });
    return true;
  },

  setText(device: string, slide: number, layerName: string, text: string, locale?: string) {
    const { id, p } = deckOrThrow(device);
    const loc = locale ?? p.activeLocale;
    let found = false;
    update((d) => {
      for (const l of d.decks[id].slides[slide]?.layers ?? [])
        if (l.type === "text" && (l.name ?? "").toLowerCase() === layerName.toLowerCase()) { l.text[loc] = text; found = true; break; }
    });
    if (!found) throw new Error(`No text layer named "${layerName}" on slide ${slide}`);
    return true;
  },

  setScreenshot(device: string, slide: number, assetId: string, which = 0) {
    const { id } = deckOrThrow(device);
    update((p) => {
      const devices = p.decks[id].slides[slide]?.layers.filter((l) => l.type === "device") ?? [];
      const target = devices[which];
      if (!target) throw new Error(`Slide ${slide} has ${devices.length} device layer(s)`);
      (target as { asset: string }).asset = assetId;
    });
    return true;
  },

  addSlide(device: string, recipeSlide: Record<string, unknown> = {}) {
    const { id, deck } = deckOrThrow(device);
    const built = buildDeck(deck.template ?? "clean-light", id, { orientation: deck.orientation, slides: [recipeSlide], locale: getState().project.locales[0] });
    update((p) => { p.decks[id].slides.push(built.slides[0]); });
    return getState().project.decks[id].slides.length - 1;
  },

  removeSlide(device: string, index: number) {
    const { id } = deckOrThrow(device);
    update((p) => { p.decks[id].slides.splice(index, 1); });
    return true;
  },

  moveSlide(device: string, from: number, to: number) {
    const { id } = deckOrThrow(device);
    update((p) => {
      const s = p.decks[id].slides;
      const [x] = s.splice(from, 1);
      s.splice(to, 0, x);
    });
    return true;
  },

  validate() {
    return validate(getState().project);
  },

  async renderSlide(device: string, index: number, o: { width?: number; locale?: string; format?: "png" | "jpeg" } = {}) {
    const { p, deck } = deckOrThrow(device);
    const locale = o.locale ?? p.activeLocale;
    await prepare(p, [deck], [locale]);
    const full = sizesFor(deck.device, deck.orientation)[0];
    const width = o.width ?? Math.min(full.w, 800);
    const size = { w: width, h: Math.round((full.h / full.w) * width) };
    const canvas = renderSlide(p, deck, index, size, locale);
    return canvas.toDataURL(o.format === "jpeg" ? "image/jpeg" : "image/png");
  },

  async exportZip(o: Partial<ExportJob> & { download?: boolean; returnBase64?: boolean } = {}) {
    const p = getState().project;
    const job: ExportJob = {
      devices: o.devices ?? Object.keys(p.decks),
      locales: o.locales ?? p.locales,
      format: o.format ?? "png",
      sizes: o.sizes,
    };
    const r = await exportBundle(p, job);
    if (o.download !== false) download(r.zip, `${p.name.replace(/\W+/g, "-")}-store-assets.zip`);
    const out: { files: number; missing: string[]; base64?: string } = { files: r.files, missing: r.missing };
    if (o.returnBase64) out.base64 = await blobToBase64(r.zip);
    return out;
  },

  async saveProjectZip(dl = true) {
    const p = getState().project;
    const zip = await exportProjectZip(p);
    if (dl) download(zip, `${p.name.replace(/\W+/g, "-")}.screenshot-guru.zip`);
    return blobToBase64(zip);
  },

  /** UI helpers */
  select(slide: number, layerId: string | null = null) {
    select(slide, layerId);
  },
  showSafeAreas(on: boolean) {
    setUi({ showSafe: on });
  },
  activeDeck() {
    return activeDeck(getState().project);
  },
  _encode: encodeCanvas,
};

async function blobToBase64(b: Blob) {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export type ScreenshotGuruApi = typeof api;

export function installAgentApi() {
  (window as unknown as { screenshotGuru: ScreenshotGuruApi }).screenshotGuru = api;
  document.documentElement.dataset.screenshotGuruApi = api.version;
}
