import type { Deck, DeviceLayer, ImageLayer, Layer, ShapeLayer, TextLayer } from "../model/types";
import { getAsset } from "../store/assets";
import { drawFrameBody, drawFrameDetails, screenRect } from "./frames";
import { drawBackground, paintStyle } from "./paint";
import { drawText } from "./text";

export type RenderOptions = {
  locale: string;
  fallbackLocale: string;
  /** Slide size in design px. */
  slideW: number;
  slideH: number;
  /** Draw a hint where a screenshot is missing (editor only). */
  placeholders?: boolean;
  /** Only draw slides in [from, to]; layers of neighbours still bleed in. */
  from?: number;
  to?: number;
};

export function localizedText(text: Record<string, string>, locale: string, fallback: string) {
  return text[locale] ?? text[fallback] ?? Object.values(text)[0] ?? "";
}

/** Draws the whole deck strip in design coordinates. The caller sets the transform. */
export function renderDeck(ctx: CanvasRenderingContext2D, deck: Deck, o: RenderOptions) {
  const n = deck.slides.length;
  const W = o.slideW, H = o.slideH;
  const from = Math.max(0, o.from ?? 0), to = Math.min(n - 1, o.to ?? n - 1);

  if (deck.spanBackground) {
    drawBackground(ctx, deck.background, 0, 0, W * n, H, 1);
  } else {
    for (let i = from; i <= to; i++) drawBackground(ctx, deck.slides[i].background ?? deck.background, i * W, 0, W, H, 1);
  }

  // Layers from neighbouring slides may overlap the range, so draw one slide either side.
  const lo = Math.max(0, from - 1), hi = Math.min(n - 1, to + 1);
  for (let i = lo; i <= hi; i++) {
    ctx.save();
    ctx.translate(i * W, 0);
    for (const layer of deck.slides[i].layers) drawLayer(ctx, layer, o);
    ctx.restore();
  }
}

export function drawLayer(ctx: CanvasRenderingContext2D, l: Layer, o: RenderOptions) {
  if (l.hidden) return;
  ctx.save();
  ctx.globalAlpha = l.opacity ?? 1;
  ctx.globalCompositeOperation = l.blend ?? "source-over";
  if (l.rotation) {
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((l.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  if (l.blur && "filter" in ctx) ctx.filter = `blur(${l.blur}px)`;
  const setShadow = () => {
    if (!l.shadow) return;
    ctx.shadowColor = l.shadow.color;
    ctx.shadowBlur = l.shadow.blur;
    ctx.shadowOffsetX = l.shadow.x;
    ctx.shadowOffsetY = l.shadow.y;
  };
  const clearShadow = () => {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  };
  switch (l.type) {
    case "text":
      setShadow();
      drawText(ctx, l, localizedText(l.text, o.locale, o.fallbackLocale), o.locale);
      break;
    case "shape":
      setShadow();
      drawShape(ctx, l);
      break;
    case "image":
      setShadow();
      drawImageLayer(ctx, l, o.locale);
      break;
    case "device":
      drawDevice(ctx, l, o, setShadow, clearShadow);
      break;
  }
  ctx.restore();
}

function coverRect(sw: number, sh: number, dw: number, dh: number, mode: "cover" | "contain" | "fill") {
  if (mode === "fill") return { x: 0, y: 0, w: dw, h: dh };
  const s = mode === "cover" ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh);
  const w = sw * s, h = sh * s;
  // cover anchors to the top so status bars and headers stay visible
  return { x: (dw - w) / 2, y: mode === "cover" ? 0 : (dh - h) / 2, w, h };
}

function drawDevice(ctx: CanvasRenderingContext2D, l: DeviceLayer, o: RenderOptions, setShadow: () => void, clearShadow: () => void) {
  const color = l.frameColor ?? "#111111";
  const s = screenRect(l.frame, l.x, l.y, l.w, l.h, l.radius ?? 0);
  setShadow();
  if (l.frame === "none") {
    // shadow comes from the screen shape itself
    ctx.fillStyle = "#000";
    ctx.beginPath();
    if (s.round) ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
    else ctx.roundRect(s.x, s.y, s.w, s.h, s.r);
    ctx.fill();
  } else {
    drawFrameBody(ctx, l.frame, l.x, l.y, l.w, l.h, color);
  }
  clearShadow();

  ctx.save();
  ctx.beginPath();
  if (s.round) ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  else ctx.roundRect(s.x, s.y, s.w, s.h, Math.min(s.r, s.w / 2, s.h / 2));
  ctx.clip();
  const a = getAsset(l.assets?.[o.locale] ?? l.asset);
  if (a) {
    const r = coverRect(a.w, a.h, s.w, s.h, "cover");
    ctx.drawImage(a.img, s.x + r.x, s.y + r.y, r.w, r.h);
  } else {
    const g = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
    g.addColorStop(0, "#2a2d34");
    g.addColorStop(1, "#15171b");
    ctx.fillStyle = g;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    if (o.placeholders) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `600 ${Math.max(10, s.w * 0.06)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Drop a screenshot", s.x + s.w / 2, s.y + s.h / 2);
    }
  }
  if (l.glare) {
    const g = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
    g.addColorStop(0, "rgba(255,255,255,0.16)");
    g.addColorStop(0.45, "rgba(255,255,255,0.03)");
    g.addColorStop(0.46, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }
  ctx.restore();
  drawFrameDetails(ctx, l.frame, l.x, l.y, l.w, l.h, color);
}

function drawImageLayer(ctx: CanvasRenderingContext2D, l: ImageLayer, locale: string) {
  const a = getAsset(l.assets?.[locale] ?? l.asset);
  if (!a) {
    ctx.strokeStyle = "rgba(127,127,127,0.6)";
    ctx.setLineDash([12, 8]);
    ctx.lineWidth = 3;
    ctx.strokeRect(l.x, l.y, l.w, l.h);
    return;
  }
  const fit = l.fit ?? "cover";
  const r = coverRect(a.w, a.h, l.w, l.h, fit);
  if (fit === "cover") r.y = (l.h - r.h) / 2;
  const path = () => {
    ctx.beginPath();
    if (l.mask === "circle") ctx.ellipse(l.x + l.w / 2, l.y + l.h / 2, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
    else ctx.roundRect(l.x, l.y, l.w, l.h, Math.min(l.radius ?? 0, l.w / 2, l.h / 2));
  };
  if (!l.fade) {
    if (l.shadow) {
      // let the shadow follow the clipped shape
      ctx.fillStyle = "#000";
      path();
      ctx.fill();
      ctx.shadowColor = "transparent";
    }
    ctx.save();
    path();
    ctx.clip();
    ctx.drawImage(a.img, l.x + r.x, l.y + r.y, r.w, r.h);
    ctx.restore();
    return;
  }
  // Fade an edge: draw into an offscreen canvas, erase with a gradient, then composite.
  const scale = ctx.getTransform().a || 1;
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.ceil(l.w * scale));
  off.height = Math.max(1, Math.ceil(l.h * scale));
  const g = off.getContext("2d")!;
  g.scale(scale, scale);
  g.save();
  g.beginPath();
  if (l.mask === "circle") g.ellipse(l.w / 2, l.h / 2, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
  else g.roundRect(0, 0, l.w, l.h, Math.min(l.radius ?? 0, l.w / 2, l.h / 2));
  g.clip();
  g.drawImage(a.img, r.x, r.y, r.w, r.h);
  g.restore();
  const f = l.fade;
  const horiz = f.side === "left" || f.side === "right";
  const len = (horiz ? l.w : l.h) * f.amount;
  let grad: CanvasGradient;
  if (f.side === "bottom") grad = g.createLinearGradient(0, l.h, 0, l.h - len);
  else if (f.side === "top") grad = g.createLinearGradient(0, 0, 0, len);
  else if (f.side === "left") grad = g.createLinearGradient(0, 0, len, 0);
  else grad = g.createLinearGradient(l.w, 0, l.w - len, 0);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = grad;
  g.fillRect(0, 0, l.w, l.h);
  ctx.drawImage(off, l.x, l.y, l.w, l.h);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function drawShape(ctx: CanvasRenderingContext2D, l: ShapeLayer) {
  ctx.fillStyle = paintStyle(ctx, l.fill, l.x, l.y, l.w, l.h);
  ctx.beginPath();
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  if (l.shape === "ellipse") ctx.ellipse(cx, cy, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
  else if (l.shape === "star") {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 0.45 : 1;
      const px = cx + Math.cos(a) * (l.w / 2) * r, py = cy + Math.sin(a) * (l.h / 2) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  } else if (l.shape === "blob") {
    // smooth closed curve through seeded points around an ellipse
    let seed = hash(l.id);
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const pts: [number, number][] = [];
    const k = 7;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2;
      const r = 0.72 + rand() * 0.28;
      pts.push([cx + Math.cos(a) * (l.w / 2) * r, cy + Math.sin(a) * (l.h / 2) * r]);
    }
    const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as const;
    const start = mid(pts[k - 1], pts[0]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < k; i++) {
      const p = pts[i], m = mid(p, pts[(i + 1) % k]);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  } else ctx.roundRect(l.x, l.y, l.w, l.h, Math.min(l.radius ?? 0, l.w / 2, l.h / 2));
  ctx.fill();
  if (l.stroke && l.stroke.width > 0) {
    ctx.shadowColor = "transparent";
    ctx.lineWidth = l.stroke.width;
    ctx.strokeStyle = l.stroke.color;
    ctx.stroke();
  }
}

/** Fonts used by a deck, so export can wait for them. */
export function decksFonts(decks: Deck[]): string[] {
  const set = new Set<string>();
  for (const d of decks) for (const s of d.slides) for (const l of s.layers) if (l.type === "text") set.add(`${l.italic ? "italic " : ""}${l.weight} 40px "${l.font}"`);
  return [...set];
}

export function deckAssets(deck: Deck): string[] {
  const set = new Set<string>();
  for (const s of deck.slides) for (const l of s.layers)
      if (l.type === "image" || l.type === "device") {
        if (l.asset) set.add(l.asset);
        for (const v of Object.values(l.assets ?? {})) if (v) set.add(v);
      }
  return [...set];
}

export type { TextLayer };
