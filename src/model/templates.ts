// Twelve built-in templates. A template is a style plus a layout sequence; it can
// build a whole deck for any device, and it expands the short "recipe" format.
import { canvasFor, getDevice } from "./devices";
import { defaultFrame, newDevice, newShape, newText, screenAspect, uid } from "./defaults";
import { frameHeight } from "../render/frames";
import type { Background, Deck, Layer, Localized, RecipeDeck, RecipeLayout, RecipeSlide, Slide, TextLayer } from "./types";

export type Style = {
  id: string;
  name: string;
  description: string;
  bg: Background;
  /** Alternate backgrounds cycled per slide (when not spanning). */
  bgCycle?: Background[];
  span?: boolean;
  font: string;
  weight: number;
  italic?: boolean;
  uppercase?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  textColor: string;
  accent: string;
  highlightStyle?: TextLayer["highlightStyle"];
  labelFont?: string;
  labelColor?: string;
  frameColor: string;
  glare?: boolean;
  shadow?: string;
  textAlign?: "left" | "center";
  sequence: RecipeLayout[];
  decor?: (W: number, H: number, i: number, s: Style) => Layer[];
};

const lin = (angle: number, ...colors: string[]): Background["paint"] => ({
  type: "linear", angle, stops: colors.map((color, i) => ({ offset: colors.length === 1 ? 0 : i / (colors.length - 1), color })),
});

export const STYLES: Style[] = [
  {
    id: "clean-light", name: "Clean Light", description: "Bright, calm and neutral. Works for any category.",
    bg: { paint: lin(165, "#f7f8fc", "#e6eaf5") },
    font: "Inter", weight: 800, letterSpacing: -0.025, textColor: "#0f172a", accent: "#4f46e5",
    labelColor: "#4f46e5", frameColor: "#111111", shadow: "rgba(15,23,42,0.22)",
    sequence: ["hero", "hero", "top", "duo", "hero", "claim"],
  },
  {
    id: "midnight-glow", name: "Midnight Glow", description: "Dark premium look with soft purple light.",
    bg: {
      paint: { type: "radial", cx: 0.5, cy: 0.15, r: 1.1, stops: [{ offset: 0, color: "#1e1440" }, { offset: 1, color: "#07070d" }] },
      orbs: [{ x: 0.85, y: 0.2, r: 0.45, color: "#7c3aed", opacity: 0.45 }, { x: 0.1, y: 0.85, r: 0.5, color: "#2563eb", opacity: 0.35 }],
      noise: 0.25,
    },
    font: "Plus Jakarta Sans", weight: 800, letterSpacing: -0.02, textColor: "#ffffff", accent: "#a78bfa",
    labelColor: "#c4b5fd", frameColor: "#1c1c1e", glare: true, shadow: "rgba(124,58,237,0.45)",
    sequence: ["hero", "top", "hero", "duo", "hero", "claim"],
  },
  {
    id: "vivid-gradient", name: "Vivid Gradient", description: "Loud warm gradient, white type, dark pill highlights.",
    bg: { paint: lin(135, "#e0115f", "#ff6a00") },
    bgCycle: [{ paint: lin(135, "#e0115f", "#ff6a00") }, { paint: lin(135, "#6a11cb", "#e0115f") }, { paint: lin(135, "#d4145a", "#f7931e") }],
    font: "Poppins", weight: 800, letterSpacing: -0.01, textColor: "#ffffff", accent: "#1a1a2e", highlightStyle: "pill",
    labelColor: "#fff3e0", frameColor: "#1a1a2e", shadow: "rgba(90,20,20,0.35)",
    sequence: ["hero", "hero", "top", "hero", "duo", "claim"],
  },
  {
    id: "pastel-dream", name: "Pastel Dream", description: "Soft pink and blue, rounded type, white devices.",
    bg: { paint: lin(160, "#fbc2eb", "#a6c1ee"), orbs: [{ x: 0.2, y: 0.25, r: 0.35, color: "#ffffff", opacity: 0.35 }] },
    font: "Nunito", weight: 900, letterSpacing: -0.01, textColor: "#3b2a4a", accent: "#e0408a",
    labelColor: "#7a4b8f", frameColor: "#f5f5f7", shadow: "rgba(90,60,120,0.25)",
    sequence: ["hero", "duo", "hero", "top", "hero", "claim"],
    decor: (W, H, i) => [newShape("blob", { x: (i % 2 ? -0.15 : 0.7) * W, y: H * 0.62, w: W * 0.5, h: W * 0.5, fill: { type: "solid", color: "#ffffff" }, opacity: 0.35, name: "Blob" })],
  },
  {
    id: "swiss-bold", name: "Swiss Bold", description: "Off-white paper, huge left-aligned type, red accent.",
    bg: { paint: { type: "solid", color: "#f2f0eb" }, pattern: { type: "grid", color: "#000000", opacity: 0.05, size: 120 } },
    font: "Inter", weight: 900, letterSpacing: -0.045, lineHeight: 0.98, textColor: "#111111", accent: "#e63022",
    labelFont: "Space Grotesk", labelColor: "#e63022", frameColor: "#111111", shadow: "rgba(0,0,0,0.18)", textAlign: "left",
    sequence: ["hero", "top", "hero", "claim", "hero", "duo"],
    decor: (W, H) => [newShape("rect", { x: W * 0.07, y: H * 0.045, w: W * 0.12, h: W * 0.018, radius: 0, fill: { type: "solid", color: "#e63022" }, name: "Rule" })],
  },
  {
    id: "aurora-glass", name: "Aurora Glass", description: "Deep blue with aurora light and film grain.",
    bg: {
      paint: lin(180, "#04111f", "#0a2236"),
      orbs: [{ x: 0.2, y: 0.1, r: 0.55, color: "#14b8a6", opacity: 0.45 }, { x: 0.9, y: 0.45, r: 0.5, color: "#22c55e", opacity: 0.25 }, { x: 0.4, y: 0.95, r: 0.55, color: "#3b82f6", opacity: 0.35 }],
      noise: 0.45,
    },
    span: true,
    font: "Sora", weight: 700, letterSpacing: -0.02, textColor: "#f0fdfa", accent: "#5eead4",
    labelColor: "#99f6e4", frameColor: "#0b1620", glare: true, shadow: "rgba(20,184,166,0.35)",
    sequence: ["hero", "span", "hero", "top", "hero", "claim"],
  },
  {
    id: "neon-night", name: "Neon Night", description: "Black, lime accent, sporty uppercase type.",
    bg: { paint: { type: "solid", color: "#060606" }, pattern: { type: "lines", color: "#c6ff00", opacity: 0.06, size: 90 }, vignette: 0.5 },
    font: "Space Grotesk", weight: 700, uppercase: true, letterSpacing: -0.02, lineHeight: 1.0, textColor: "#ffffff", accent: "#c6ff00",
    labelColor: "#c6ff00", frameColor: "#1a1a1a", shadow: "rgba(198,255,0,0.25)",
    sequence: ["hero", "duo", "hero", "top", "claim", "hero"],
  },
  {
    id: "paper-japandi", name: "Paper Japandi", description: "Warm paper, quiet serif, lots of air.",
    bg: { paint: { type: "solid", color: "#efe8dc" }, noise: 0.5 },
    font: "Fraunces", weight: 600, letterSpacing: -0.015, textColor: "#2d2a26", accent: "#b5651d",
    labelFont: "DM Sans", labelColor: "#8a7f72", frameColor: "#2d2a26", shadow: "rgba(45,42,38,0.2)",
    sequence: ["hero", "hero", "top", "hero", "claim", "duo"],
    decor: (W, H, i) => [newShape("ellipse", { x: (i % 2 ? 0.62 : -0.12) * W, y: H * 0.5, w: W * 0.5, h: W * 0.5, fill: { type: "solid", color: "#d9c9b0" }, opacity: 0.6, name: "Sun" })],
  },
  {
    id: "candy-pop", name: "Candy Pop", description: "Yellow, dots, pink pills. Fun and social.",
    bg: { paint: { type: "solid", color: "#ffde59" }, pattern: { type: "dots", color: "#1b1b1b", opacity: 0.12, size: 60 } },
    bgCycle: [
      { paint: { type: "solid", color: "#ffde59" }, pattern: { type: "dots", color: "#1b1b1b", opacity: 0.12, size: 60 } },
      { paint: { type: "solid", color: "#7ce0ff" }, pattern: { type: "dots", color: "#1b1b1b", opacity: 0.12, size: 60 } },
      { paint: { type: "solid", color: "#ffb3d1" }, pattern: { type: "dots", color: "#1b1b1b", opacity: 0.12, size: 60 } },
    ],
    font: "Poppins", weight: 800, letterSpacing: -0.02, textColor: "#1b1b1b", accent: "#ff3d7f", highlightStyle: "marker",
    labelColor: "#1b1b1b", frameColor: "#1b1b1b", shadow: "rgba(0,0,0,0.25)",
    sequence: ["hero", "duo", "hero", "top", "hero", "claim"],
    decor: (W, H, i) => [newShape("star", { x: (i % 2 ? 0.05 : 0.78) * W, y: H * 0.28, w: W * 0.14, h: W * 0.14, fill: { type: "solid", color: "#ff3d7f" }, rotation: 12, name: "Star" })],
  },
  {
    id: "ocean-tilt", name: "Ocean Tilt", description: "Electric blue gradient with tilted device pairs.",
    bg: { paint: lin(150, "#0052d4", "#4364f7", "#6fb1fc") },
    font: "Manrope", weight: 800, letterSpacing: -0.02, textColor: "#ffffff", accent: "#ffe066",
    labelColor: "#dbeafe", frameColor: "#0f172a", glare: true, shadow: "rgba(0,20,80,0.4)",
    sequence: ["duo", "hero", "duo", "top", "duo", "claim"],
  },
  {
    id: "panorama", name: "Panorama", description: "One gradient across all slides, devices crossing edges.",
    bg: { paint: lin(100, "#1e1b4b", "#7c3aed", "#db2777", "#f97316"), noise: 0.2 },
    span: true,
    font: "Outfit", weight: 800, letterSpacing: -0.02, textColor: "#ffffff", accent: "#fde68a",
    labelColor: "#fce7f3", frameColor: "#111111", glare: true, shadow: "rgba(0,0,0,0.35)",
    sequence: ["hero", "span", "hero", "span", "hero", "claim"],
  },
  {
    id: "editorial-serif", name: "Editorial Serif", description: "Dark magazine style with italic serif headlines.",
    bg: { paint: { type: "solid", color: "#121212" }, noise: 0.3 },
    font: "Instrument Serif", weight: 400, italic: true, letterSpacing: -0.01, lineHeight: 1.0, textColor: "#f5f0e8", accent: "#ff7a45",
    labelFont: "Inter", labelColor: "#ff7a45", frameColor: "#2a2a2a", shadow: "rgba(0,0,0,0.5)", textAlign: "left",
    sequence: ["hero", "top", "hero", "claim", "duo", "hero"],
  },
];

export const STYLE_MAP: Record<string, Style> = Object.fromEntries(STYLES.map((s) => [s.id, s]));

const DEFAULT_COPY: { label: string; headline: string }[] = [
  { label: "WELCOME", headline: "Your app's\n**big promise**" },
  { label: "FEATURE", headline: "Do the main thing\nin **one tap**" },
  { label: "FEATURE", headline: "See your **progress**\nat a glance" },
  { label: "FEATURE", headline: "Two screens,\n**one flow**" },
  { label: "FEATURE", headline: "Works **offline**,\nsyncs later" },
  { label: "JOIN", headline: "Start **free**\ntoday" },
];

// ---------------------------------------------------------------------------

type Ctx = { deviceId: string; W: number; H: number; style: Style; locale: string; appName: string; icon?: string };

const loc = (v: string | Localized | undefined, locale: string): Localized | undefined =>
  v === undefined ? undefined : typeof v === "string" ? { [locale]: v } : v;

function kind(c: Ctx): "portrait" | "wide" | "square" | "watch" {
  const d = getDevice(c.deviceId);
  if (d.id === "apple-watch") return "watch";
  const r = c.W / c.H;
  if (r > 1.15) return "wide";
  if (r > 0.87) return "square";
  return "portrait";
}

function headline(c: Ctx, text: Localized, box: { x: number; y: number; w: number; h: number }, size: number, align?: "left" | "center"): TextLayer {
  const s = c.style;
  return newText("", c.locale, {
    name: "Headline", text, ...box, size: Math.round(size), autoFit: true,
    font: s.font, weight: s.weight, italic: s.italic, uppercase: s.uppercase,
    letterSpacing: s.letterSpacing ?? -0.02, lineHeight: s.lineHeight ?? 1.06,
    align: align ?? s.textAlign ?? "center",
    fill: { type: "solid", color: s.textColor }, highlight: s.accent, highlightStyle: s.highlightStyle,
  });
}

function label(c: Ctx, text: Localized, box: { x: number; y: number; w: number; h: number }, size: number, align?: "left" | "center"): TextLayer {
  const s = c.style;
  return newText("", c.locale, {
    name: "Label", text, ...box, size: Math.round(size), autoFit: true,
    font: s.labelFont ?? s.font, weight: 700, uppercase: true, letterSpacing: 0.14, lineHeight: 1.2,
    align: align ?? s.textAlign ?? "center",
    fill: { type: "solid", color: s.labelColor ?? s.accent }, highlight: s.accent,
  });
}

function shot(v: string | Localized | undefined, locale: string): { asset: string; assets?: Localized } {
  if (!v) return { asset: "" };
  if (typeof v === "string") return { asset: v };
  return { asset: v[locale] ?? Object.values(v)[0] ?? "", assets: { ...v } };
}

function device(c: Ctx, src: string | Localized | undefined, x: number, y: number, w: number, rotation = 0) {
  const frame = defaultFrame(c.deviceId);
  const h = frameHeight(frame, w, screenAspect(c.deviceId, frame));
  return newDevice(c.deviceId, c.W, c.H, {
    ...shot(src, c.locale), frame, x, y, w, h, rotation,
    frameColor: c.style.frameColor, glare: c.style.glare,
    shadow: { color: c.style.shadow ?? "rgba(0,0,0,0.25)", blur: Math.min(c.W, c.H) * 0.06, x: 0, y: Math.min(c.W, c.H) * 0.03 },
  });
}

function buildSlide(c: Ctx, layout: RecipeLayout, rs: RecipeSlide, i: number, last: boolean): Slide {
  const { W, H, style: s, locale } = c;
  const k = kind(c);
  const hl = loc(rs.headline, locale) ?? { [locale]: "" };
  const lb = loc(rs.label, locale);
  const sub = loc(rs.subline, locale);
  const layers: Layer[] = [];
  const left = (s.textAlign ?? "center") === "left";
  const m = W * 0.07;

  // Wear OS and similar: the store wants the plain UI, full bleed.
  if (getDevice(c.deviceId).noFrame || layout === "full") {
    layers.push(newDevice(c.deviceId, W, H, { ...shot(rs.screenshot, locale), frame: "none", x: 0, y: 0, w: W, h: H, radius: 0, shadow: undefined, name: "Screenshot" }));
    return { id: uid("sl"), layers, background: rs.background };
  }

  if (k === "wide") {
    // Text left, device right. Claim/icon slides centre the text.
    const centred = layout === "claim" || layout === "icon" || !rs.screenshot && layout !== "side" && layout !== "hero";
    if (layout === "icon" && c.icon) {
      layers.push({ id: uid("i"), type: "image", name: "App icon", asset: c.icon, x: W / 2 - H * 0.14, y: H * 0.16, w: H * 0.28, h: H * 0.28, radius: H * 0.064, fit: "cover", shadow: { color: "rgba(0,0,0,0.25)", blur: H * 0.04, x: 0, y: H * 0.015 } });
    }
    if (centred) {
      const top = layout === "icon" && c.icon ? H * 0.5 : H * 0.28;
      if (lb) layers.push(label(c, lb, { x: W * 0.1, y: top - H * 0.1, w: W * 0.8, h: H * 0.07 }, H * 0.045, "center"));
      layers.push(headline(c, hl, { x: W * 0.1, y: top, w: W * 0.8, h: H * 0.3 }, H * 0.13, "center"));
      if (sub) layers.push(newText("", locale, { name: "Subline", text: sub, x: W * 0.15, y: top + H * 0.32, w: W * 0.7, h: H * 0.12, size: Math.round(H * 0.05), weight: 500, font: s.labelFont ?? s.font, align: "center", fill: { type: "solid", color: s.textColor }, opacity: 0.8, autoFit: true }));
    } else {
      if (lb) layers.push(label(c, lb, { x: W * 0.075, y: H * 0.17, w: W * 0.43, h: H * 0.07 }, H * 0.05, "left"));
      layers.push({ ...headline(c, hl, { x: W * 0.075, y: H * 0.26, w: W * 0.43, h: H * 0.46 }, H * 0.15, "left"), vAlign: lb ? "top" : "middle" });
      if (sub) layers.push(newText("", locale, { name: "Subline", text: sub, x: W * 0.075, y: H * 0.74, w: W * 0.4, h: H * 0.12, size: Math.round(H * 0.045), weight: 500, font: s.labelFont ?? s.font, align: "left", fill: { type: "solid", color: s.textColor }, opacity: 0.8, autoFit: true }));
      const frame = defaultFrame(c.deviceId);
      const tall = frame === "phone" || frame === "phone-android";
      const dw = tall ? H * 0.42 : W * 0.44;
      const dev = device(c, rs.screenshot, W * 0.53 + (W * 0.44 - dw) / 2, tall ? H * 0.14 : H * 0.18, dw);
      layers.push(dev);
      if (layout === "duo" && rs.screenshot2) layers.push(device(c, rs.screenshot2, dev.x - dw * 0.55, dev.y + H * 0.1, dw * 0.9, -6));
    }
    if (s.decor) layers.unshift(...s.decor(W, H, i, s).map((l) => ({ ...l, opacity: (l.opacity ?? 1) * 0.6 })));
    return { id: uid("sl"), layers, background: rs.background };
  }

  const small = k === "watch";
  const sq = k === "square";
  const tx = left ? m : W * 0.06, tw = left ? W - m * 2 : W * 0.88;
  const lSize = W * (small ? 0.05 : 0.04), hSize = W * (small ? 0.1 : sq ? 0.075 : 0.092);

  if (s.decor) layers.push(...s.decor(W, H, i, s));

  switch (layout === "span" && last ? "hero" : layout) {
    case "top": {
      const dw = W * (small ? 0.72 : 0.76);
      const dev = device(c, rs.screenshot, (W - dw) / 2, -H * (sq ? 0.25 : 0.18), dw);
      layers.push(dev);
      const ty = Math.max(dev.y + dev.h + H * 0.04, H * 0.66);
      if (lb) layers.push(label(c, lb, { x: tx, y: ty, w: tw, h: H * 0.035 }, lSize));
      layers.push(headline(c, hl, { x: tx, y: ty + (lb ? H * 0.045 : 0), w: tw, h: H - ty - H * 0.07 }, hSize));
      break;
    }
    case "duo": {
      if (lb) layers.push(label(c, lb, { x: tx, y: H * 0.06, w: tw, h: H * 0.035 }, lSize));
      layers.push(headline(c, hl, { x: tx, y: H * 0.1, w: tw, h: H * 0.19 }, hSize));
      const dw = W * 0.62;
      layers.push(device(c, rs.screenshot2 ?? rs.screenshot, W * 0.38, H * 0.38, dw, 8));
      layers.push(device(c, rs.screenshot, 0, H * 0.33, dw, -6));
      break;
    }
    case "claim":
    case "icon": {
      let y = H * 0.3;
      if (c.icon) {
        const iw = W * 0.3;
        layers.push({ id: uid("i"), type: "image", name: "App icon", asset: c.icon, x: (W - iw) / 2, y: H * 0.2, w: iw, h: iw, radius: iw * 0.225, fit: "cover", shadow: { color: "rgba(0,0,0,0.25)", blur: W * 0.05, x: 0, y: W * 0.02 } });
        y = H * 0.2 + iw + H * 0.05;
      }
      if (lb) layers.push(label(c, lb, { x: tx, y: y - H * 0.05, w: tw, h: H * 0.035 }, lSize, "center"));
      layers.push(headline(c, hl, { x: tx, y, w: tw, h: H * 0.24 }, hSize * 1.15, "center"));
      if (sub) layers.push(newText("", locale, { name: "Subline", text: sub, x: tx, y: y + H * 0.26, w: tw, h: H * 0.1, size: Math.round(W * 0.045), weight: 500, font: s.labelFont ?? s.font, align: "center", fill: { type: "solid", color: s.textColor }, opacity: 0.8, autoFit: true }));
      if (!c.icon && rs.screenshot) {
        const dw = W * 0.6;
        layers.push(device(c, rs.screenshot, (W - dw) / 2, H * 0.68, dw));
      }
      break;
    }
    case "span": {
      if (lb) layers.push(label(c, lb, { x: tx, y: H * 0.06, w: tw, h: H * 0.035 }, lSize));
      layers.push(headline(c, hl, { x: tx, y: H * 0.1, w: tw, h: H * 0.2 }, hSize));
      const dw = W * 0.74;
      // sits across the right edge so it continues on the next slide
      layers.push(device(c, rs.screenshot, W - dw * 0.5, H * 0.34, dw, 6));
      break;
    }
    default: {
      // hero: headline top, device below bleeding off the bottom
      const ty = H * (small ? 0.05 : 0.06);
      if (lb && !small) layers.push(label(c, lb, { x: tx, y: ty, w: tw, h: H * 0.035 }, lSize));
      layers.push(headline(c, hl, { x: tx, y: ty + (lb && !small ? H * 0.045 : 0), w: tw, h: H * (small ? 0.24 : sq ? 0.26 : 0.2) }, hSize));
      if (sub && !small) layers.push(newText("", locale, { name: "Subline", text: sub, x: tx, y: H * 0.27, w: tw, h: H * 0.05, size: Math.round(W * 0.042), weight: 500, font: s.labelFont ?? s.font, align: left ? "left" : "center", fill: { type: "solid", color: s.textColor }, opacity: 0.8, autoFit: true }));
      const dw = W * (small ? 0.72 : sq ? 0.5 : 0.78);
      layers.push(device(c, rs.screenshot, (W - dw) / 2, H * (small ? 0.33 : sq ? 0.38 : sub ? 0.33 : 0.285), dw));
    }
  }
  return { id: uid("sl"), layers, background: rs.background };
}

/** Build a deck from a template id and recipe slides (or default copy). */
export function buildDeck(
  templateId: string,
  deviceId: string,
  opts: { orientation?: "portrait" | "landscape"; slides?: RecipeSlide[]; locale?: string; appName?: string; icon?: string; style?: RecipeDeck["style"] } = {},
): Deck {
  const base = STYLE_MAP[templateId] ?? STYLES[0];
  const style: Style = {
    ...base,
    accent: opts.style?.accent ?? base.accent,
    font: opts.style?.font ?? base.font,
    frameColor: opts.style?.frameColor ?? base.frameColor,
    textColor: opts.style?.textColor ?? base.textColor,
    bg: opts.style?.background ?? base.bg,
    bgCycle: opts.style?.background ? undefined : base.bgCycle,
  };
  const dev = getDevice(deviceId);
  const orientation = dev.rotatable ? opts.orientation ?? "portrait" : "portrait";
  const { w: W, h: H } = canvasFor(deviceId, orientation);
  const locale = opts.locale ?? "en";
  const n = opts.slides?.length ?? Math.min(dev.slides.suggested, 6);
  const recipe: RecipeSlide[] =
    opts.slides ??
    Array.from({ length: n }, (_, i) => ({ label: DEFAULT_COPY[i % 6].label, headline: DEFAULT_COPY[i % 6].headline }));
  // single-image canvases (banners) default to an icon/claim layout
  const single = dev.slides.max === 1 || (dev.store === "promo" && n === 1);
  const c: Ctx = { deviceId, W, H, style, locale, appName: opts.appName ?? "My App", icon: opts.icon };
  const slides = recipe.map((rs, i) => {
    let layout: RecipeLayout = rs.layout ?? (single ? (rs.screenshot ? "side" : "icon") : style.sequence[i % style.sequence.length]);
    if (layout === "duo" && !rs.screenshot2 && !rs.screenshot) layout = "hero";
    const slide = buildSlide(c, layout, rs, i, i === recipe.length - 1);
    if (!style.span && !slide.background && style.bgCycle) slide.background = structuredClone(style.bgCycle[i % style.bgCycle.length]);
    return slide;
  });
  return {
    device: deviceId, orientation, template: style.id,
    background: structuredClone(style.bg), spanBackground: !!style.span && slides.length > 1,
    slides,
  };
}

/** Pick a template's style values to restyle an existing deck without touching layout. */
export function restyleDeck(deck: Deck, templateId: string): Deck {
  const s = STYLE_MAP[templateId];
  if (!s) return deck;
  const d = structuredClone(deck);
  d.background = structuredClone(s.bg);
  d.spanBackground = !!s.span && d.slides.length > 1;
  d.template = s.id;
  d.slides.forEach((slide, i) => {
    slide.background = !s.span && s.bgCycle ? structuredClone(s.bgCycle[i % s.bgCycle.length]) : undefined;
    for (const l of slide.layers) {
      if (l.type === "text") {
        const isLabel = l.name === "Label";
        l.font = isLabel ? s.labelFont ?? s.font : s.font;
        if (!isLabel) {
          l.weight = s.weight;
          l.italic = s.italic;
          l.uppercase = s.uppercase;
          l.letterSpacing = s.letterSpacing;
          l.lineHeight = s.lineHeight ?? 1.06;
          l.highlightStyle = s.highlightStyle;
        }
        l.fill = { type: "solid", color: isLabel ? s.labelColor ?? s.accent : s.textColor };
        l.highlight = s.accent;
      } else if (l.type === "device") {
        l.frameColor = s.frameColor;
        l.glare = s.glare;
        if (l.shadow) l.shadow.color = s.shadow ?? l.shadow.color;
      }
    }
  });
  return d;
}

/** Expand a deck from the recipe format, or pass a full deck through. */
export function expandDeck(deviceId: string, input: unknown, locale: string, appName: string, icon?: string): Deck {
  const obj = input as Partial<Deck> & Partial<RecipeDeck>;
  if (obj && Array.isArray(obj.slides) && obj.slides.every((s) => Array.isArray((s as Slide).layers))) {
    const deck = obj as Deck;
    return { ...deck, device: deviceId, orientation: deck.orientation ?? "portrait", spanBackground: !!deck.spanBackground, background: deck.background ?? STYLES[0].bg };
  }
  const r = obj as RecipeDeck;
  return buildDeck(r.template ?? "clean-light", deviceId, { orientation: r.orientation, slides: r.slides, locale, appName, icon, style: r.style });
}

export type { Deck };

/** Pull the copy and screenshots back out of a deck, so it can be rebuilt with another template or orientation. */
export function extractRecipe(deck: Deck, baseLocale = "en"): RecipeSlide[] {
  return deck.slides.map((s) => {
    const byName = (n: string) => s.layers.find((l) => l.type === "text" && l.name === n) as TextLayer | undefined;
    const devices = s.layers.filter((l) => l.type === "device") as import("./types").DeviceLayer[];
    const shotOf = (d?: import("./types").DeviceLayer) =>
      !d ? undefined : d.assets && Object.keys(d.assets).length ? { ...d.assets, [baseLocale]: d.asset } : d.asset || undefined;
    const hl = byName("Headline") ?? (s.layers.find((l) => l.type === "text") as TextLayer | undefined);
    const r: RecipeSlide = { headline: hl?.text, label: byName("Label")?.text, subline: byName("Subline")?.text };
    // the last device drawn is the front one in duo layouts
    const front = devices[devices.length - 1];
    if (front) r.screenshot = shotOf(front);
    if (devices.length > 1) r.screenshot2 = shotOf(devices[0]);
    if (devices.length > 1) r.layout = "duo";
    else if (!devices.length) r.layout = "claim";
    return r;
  });
}
