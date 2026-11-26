// Core data model. Everything here is plain JSON so a project can be saved to
// IndexedDB, exported as a .zip, or written by an AI agent following the skill.

export type Localized = Record<string, string>;

export type GradientStop = { offset: number; color: string };

export type Paint =
  | { type: "solid"; color: string }
  | { type: "linear"; angle: number; stops: GradientStop[] }
  | { type: "radial"; cx: number; cy: number; r: number; stops: GradientStop[] };

export type Pattern = "none" | "dots" | "grid" | "lines" | "waves";

export type Background = {
  paint: Paint;
  /** Soft colored light blobs layered over the paint. Coordinates are 0..1 of the area. */
  orbs?: { x: number; y: number; r: number; color: string; opacity: number }[];
  pattern?: { type: Pattern; color: string; opacity: number; size: number };
  /** Film grain, 0..1. */
  noise?: number;
  /** Darkened edges, 0..1. */
  vignette?: number;
};

export type Shadow = { color: string; blur: number; x: number; y: number };

export type BlendMode =
  | "source-over" | "multiply" | "screen" | "overlay" | "soft-light"
  | "hard-light" | "color-dodge" | "lighten" | "darken" | "difference";

type LayerBase = {
  id: string;
  name?: string;
  /** Position and size in slide pixels (design canvas). May extend past the slide edge into neighbours. */
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  blend?: BlendMode;
  hidden?: boolean;
  locked?: boolean;
  shadow?: Shadow;
  /** Gaussian blur in px. */
  blur?: number;
};

export type TextLayer = LayerBase & {
  type: "text";
  /** Text per locale. Wrap a phrase in **double stars** to paint it with the highlight colour. */
  text: Localized;
  font: string;
  weight: number;
  size: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  italic?: boolean;
  uppercase?: boolean;
  fill: Paint;
  highlight?: string;
  /** Rounded pill drawn behind highlighted words. */
  highlightStyle?: "color" | "marker" | "pill";
  stroke?: { color: string; width: number };
  /** Shrink the font until the text fits the box. */
  autoFit?: boolean;
};

export type ImageLayer = LayerBase & {
  type: "image";
  asset: string;
  /** Per-locale replacement images, e.g. { de: "shot-de" }. */
  assets?: Localized;
  fit?: "cover" | "contain" | "fill";
  radius?: number;
  mask?: "none" | "circle";
  /** Fade one edge to transparent, 0..1 of the size. */
  fade?: { side: "top" | "bottom" | "left" | "right"; amount: number };
};

export type FrameKind =
  | "phone" | "phone-android" | "tablet" | "watch" | "watch-round"
  | "laptop" | "tv" | "browser" | "none";

export type DeviceLayer = LayerBase & {
  type: "device";
  /** Screenshot asset id; empty shows a placeholder. */
  asset: string;
  /** Per-locale screenshots, e.g. { de: "home-de" }. Falls back to asset. */
  assets?: Localized;
  frame: FrameKind;
  frameColor?: string;
  /** Glossy reflection over the screen. */
  glare?: boolean;
  /** Corner radius used when frame is "none". */
  radius?: number;
};

export type ShapeLayer = LayerBase & {
  type: "shape";
  shape: "rect" | "ellipse" | "star" | "blob";
  fill: Paint;
  radius?: number;
  stroke?: { color: string; width: number };
};

export type Layer = TextLayer | ImageLayer | DeviceLayer | ShapeLayer;

export type Slide = {
  id: string;
  /** Overrides the deck background for this slide (only when the deck background does not span). */
  background?: Background;
  layers: Layer[];
};

export type Deck = {
  device: string;
  orientation: "portrait" | "landscape";
  background: Background;
  /** true: one background flows across the whole strip; false: each slide gets its own copy. */
  spanBackground: boolean;
  slides: Slide[];
  /** Template this deck was built from, informational. */
  template?: string;
};

export type Project = {
  schema: "screenshot-guru/1";
  name: string;
  locales: string[];
  activeLocale: string;
  activeDevice: string;
  decks: Record<string, Deck>;
  /** Optional app icon asset id. */
  icon?: string;
  /** User-uploaded fonts: family name -> asset id. */
  fonts?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// "Recipe" format: the short form an AI agent writes. The app expands it into
// full layers using a template. See skill/references/project-format.md.
// ---------------------------------------------------------------------------

export type RecipeLayout = "hero" | "top" | "duo" | "claim" | "span" | "side" | "full" | "icon";

export type RecipeSlide = {
  layout?: RecipeLayout;
  label?: string | Localized;
  headline?: string | Localized;
  subline?: string | Localized;
  /** Asset path or id. A locale map gives localized screenshots: { "en": "assets/en/home.png", "de": "assets/de/home.png" }. */
  screenshot?: string | Localized;
  screenshot2?: string | Localized;
  background?: Background;
};

export type RecipeDeck = {
  template: string;
  orientation?: "portrait" | "landscape";
  /** Overrides applied on top of the template style. */
  style?: Partial<{ accent: string; background: Background; font: string; frameColor: string; textColor: string }>;
  slides: RecipeSlide[];
};
