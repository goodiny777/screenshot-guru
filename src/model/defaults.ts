import { canvasFor, getDevice } from "./devices";
import { frameHeight } from "../render/frames";
import type { Background, Deck, DeviceLayer, FrameKind, ImageLayer, Project, ShapeLayer, Slide, TextLayer } from "./types";

export const uid = (p = "l") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const DEFAULT_BG: Background = {
  paint: { type: "linear", angle: 160, stops: [{ offset: 0, color: "#f5f6fb" }, { offset: 1, color: "#e4e8f4" }] },
};

/** Frame used for a device's screenshots. Promo canvases show a phone. */
export function defaultFrame(deviceId: string): FrameKind {
  const d = getDevice(deviceId);
  if (d.noFrame) return "none";
  if (d.frame === "none") return d.id === "vision-pro" || d.id === "android-xr" ? "none" : "phone";
  return d.frame;
}

/** Aspect ratio (w/h) of a typical screenshot shown inside this device's frame. */
export function screenAspect(deviceId: string, frame: FrameKind) {
  const d = getDevice(deviceId);
  if (frame === "phone" || frame === "phone-android") {
    if (d.store === "google") return 1080 / 2400;
    return 1206 / 2622;
  }
  if (frame === "watch-round") return 1;
  return d.canvas.w / d.canvas.h;
}

export function newText(text: string, locale: string, over: Partial<TextLayer> = {}): TextLayer {
  return {
    id: uid("t"), type: "text", name: "Text",
    x: 80, y: 120, w: 900, h: 300,
    text: { [locale]: text },
    font: "Inter", weight: 800, size: 110, lineHeight: 1.08, letterSpacing: -0.02,
    align: "center", vAlign: "top",
    fill: { type: "solid", color: "#111827" },
    highlight: "#4f46e5",
    ...over,
  };
}

export function newDevice(deviceId: string, slideW: number, slideH: number, over: Partial<DeviceLayer> = {}): DeviceLayer {
  const frame = over.frame ?? defaultFrame(deviceId);
  const wide = slideW > slideH;
  const w = over.w ?? (wide ? slideH * 0.45 : slideW * 0.74);
  const h = over.h ?? frameHeight(frame, w, screenAspect(deviceId, frame));
  return {
    id: uid("d"), type: "device", name: "Device",
    x: (slideW - w) / 2, y: slideH * 0.32, w, h,
    asset: "", frame, frameColor: "#111111", glare: false,
    shadow: { color: "rgba(0,0,0,0.28)", blur: slideW * 0.05, x: 0, y: slideW * 0.025 },
    ...over,
  };
}

export function newShape(shape: ShapeLayer["shape"], over: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: uid("s"), type: "shape", name: shape[0].toUpperCase() + shape.slice(1),
    shape, x: 100, y: 100, w: 300, h: 300, radius: 40,
    fill: { type: "solid", color: "#4f46e5" },
    ...over,
  };
}

export function newImage(asset: string, w: number, h: number, over: Partial<ImageLayer> = {}): ImageLayer {
  return { id: uid("i"), type: "image", name: "Image", asset, x: 100, y: 100, w, h, fit: "contain", ...over };
}

export function newSlide(layers = [] as Slide["layers"]): Slide {
  return { id: uid("sl"), layers };
}

export function emptyDeck(deviceId: string, orientation: "portrait" | "landscape" = "portrait"): Deck {
  const { w, h } = canvasFor(deviceId, orientation);
  const count = Math.min(getDevice(deviceId).slides.suggested, 3);
  return {
    device: deviceId, orientation, background: structuredClone(DEFAULT_BG), spanBackground: false,
    slides: Array.from({ length: count }, (_, i) =>
      newSlide([
        newText(`Your **headline**\nnumber ${i + 1}`, "en", { x: w * 0.07, y: h * 0.07, w: w * 0.86, h: h * 0.2, size: Math.round(w * 0.085) }),
        newDevice(deviceId, w, h),
      ]),
    ),
  };
}

export function emptyProject(): Project {
  return {
    schema: "screenshot-guru/1",
    name: "My App",
    locales: ["en"],
    activeLocale: "en",
    activeDevice: "iphone",
    decks: {},
  };
}
