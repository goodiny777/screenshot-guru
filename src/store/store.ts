// Tiny global store with undo/redo and IndexedDB autosave. React components
// subscribe with useStore(selector).
import { useSyncExternalStore } from "react";
import { createStore, get, set } from "idb-keyval";
import { canvasFor } from "../model/devices";
import { emptyProject } from "../model/defaults";
import { buildDeck } from "../model/templates";
import type { Deck, Layer, Project } from "../model/types";

const db = createStore("screenshot-guru-state", "kv");

export type Selection = { slide: number; layer: string | null };

type State = {
  project: Project;
  selection: Selection;
  zoom: number;
  showSafe: boolean;
  ready: boolean;
};

let state: State = {
  project: emptyProject(),
  selection: { slide: 0, layer: null },
  zoom: 0,
  showSafe: true,
  ready: false,
};

const listeners = new Set<() => void>();
const undo: Project[] = [];
const redo: Project[] = [];
let lastKey = "";
let lastTime = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state));
}

export function setUi(patch: Partial<Omit<State, "project">>) {
  state = { ...state, ...patch };
  emit();
}

/**
 * Change the project. `fn` gets a deep copy to mutate. Edits with the same
 * `key` within 600 ms merge into one undo step (dragging, typing).
 */
export function update(fn: (p: Project) => void, key = "") {
  const next = structuredClone(state.project);
  fn(next);
  const now = Date.now();
  if (!(key && key === lastKey && now - lastTime < 600)) {
    undo.push(state.project);
    if (undo.length > 100) undo.shift();
    redo.length = 0;
  }
  lastKey = key;
  lastTime = now;
  state = { ...state, project: next };
  clampSelection();
  emit();
  scheduleSave();
}

export function replaceProject(p: Project, keepHistory = true) {
  if (keepHistory) {
    undo.push(state.project);
    redo.length = 0;
  }
  state = { ...state, project: p, selection: { slide: 0, layer: null } };
  emit();
  scheduleSave();
}

export function doUndo() {
  const p = undo.pop();
  if (!p) return;
  redo.push(state.project);
  state = { ...state, project: p };
  lastKey = "";
  clampSelection();
  emit();
  scheduleSave();
}

export function doRedo() {
  const p = redo.pop();
  if (!p) return;
  undo.push(state.project);
  state = { ...state, project: p };
  lastKey = "";
  clampSelection();
  emit();
  scheduleSave();
}

export const canUndo = () => undo.length > 0;
export const canRedo = () => redo.length > 0;

function clampSelection() {
  const deck = activeDeck(state.project);
  if (!deck) return;
  const slide = Math.min(state.selection.slide, deck.slides.length - 1);
  const layerExists = state.selection.layer && deck.slides[slide]?.layers.some((l) => l.id === state.selection.layer);
  state = { ...state, selection: { slide: Math.max(0, slide), layer: layerExists ? state.selection.layer : null } };
}

export function select(slide: number, layer: string | null) {
  state = { ...state, selection: { slide, layer } };
  emit();
}

// ---------------------------------------------------------------------------
// Helpers

export function activeDeck(p: Project): Deck | undefined {
  return p.decks[p.activeDevice];
}

/** The deck for the active device, creating it from the last-used template when missing. */
export function ensureDeck(deviceId: string) {
  const p = state.project;
  if (p.decks[deviceId]) return;
  const template = Object.values(p.decks)[0]?.template ?? "clean-light";
  update((d) => {
    d.decks[deviceId] = buildDeck(template, deviceId, { locale: d.activeLocale, appName: d.name, icon: d.icon });
  });
}

export function deckSize(deck: Deck) {
  return canvasFor(deck.device, deck.orientation);
}

export function findLayer(p: Project, slide: number, id: string | null): Layer | undefined {
  if (!id) return undefined;
  return activeDeck(p)?.slides[slide]?.layers.find((l) => l.id === id);
}

export function updateLayer(slide: number, id: string, patch: Partial<Layer> | ((l: Layer) => void), key?: string) {
  update((p) => {
    const l = activeDeck(p)?.slides[slide]?.layers.find((x) => x.id === id);
    if (!l) return;
    if (typeof patch === "function") patch(l);
    else Object.assign(l, patch);
  }, key ?? `layer:${id}`);
}

// ---------------------------------------------------------------------------
// Persistence

let saveTimer: number | undefined;
function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void set("project", state.project, db), 400);
}

export async function loadSaved() {
  const saved = (await get("project", db)) as Project | undefined;
  if (saved && saved.schema === "screenshot-guru/1") {
    state = { ...state, project: saved, ready: true };
  } else {
    const p = emptyProject();
    p.decks.iphone = buildDeck("clean-light", "iphone", { locale: "en", appName: p.name });
    state = { ...state, project: p, ready: true };
  }
  emit();
}

// User templates: whole decks saved under a name.
export type UserTemplate = { id: string; name: string; device: string; deck: Deck; created: number };

export async function listUserTemplates(): Promise<UserTemplate[]> {
  return ((await get("templates", db)) as UserTemplate[] | undefined) ?? [];
}

export async function saveUserTemplate(name: string, deck: Deck) {
  const list = await listUserTemplates();
  list.unshift({ id: `u_${Date.now().toString(36)}`, name, device: deck.device, deck: structuredClone(deck), created: Date.now() });
  await set("templates", list, db);
  return list;
}

export async function deleteUserTemplate(id: string) {
  const list = (await listUserTemplates()).filter((t) => t.id !== id);
  await set("templates", list, db);
  return list;
}

/** Fit a saved deck onto another device by scaling layer geometry. */
export function adaptDeck(deck: Deck, deviceId: string, orientation: "portrait" | "landscape"): Deck {
  const from = canvasFor(deck.device, deck.orientation);
  const to = canvasFor(deviceId, orientation);
  const d = structuredClone(deck);
  d.device = deviceId;
  d.orientation = orientation;
  if (from.w === to.w && from.h === to.h) return d;
  const sx = to.w / from.w, sy = to.h / from.h, s = Math.min(sx, sy);
  for (const slide of d.slides)
    for (const l of slide.layers) {
      const cx = (l.x + l.w / 2) * sx, cy = (l.y + l.h / 2) * sy;
      const keep = l.type === "device" || l.type === "image" || (l.type === "shape" && l.shape !== "rect");
      l.w = keep ? l.w * s : l.w * sx;
      l.h = keep ? l.h * s : l.h * sy;
      l.x = cx - l.w / 2;
      l.y = cy - l.h / 2;
      if (l.type === "text") l.size *= s;
      if (l.shadow) { l.shadow.blur *= s; l.shadow.x *= s; l.shadow.y *= s; }
    }
  return d;
}
