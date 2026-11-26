// Generic, brand-free device frames drawn with vector paths. No vendor artwork is
// bundled, so the frames are safe to ship and scale to any export size.
import type { FrameKind } from "../model/types";

/** Screen insets as fractions of the frame width, plus corner radii. */
type Geometry = { l: number; r: number; t: number; b: number; bodyR: number; screenR: number };

const GEO: Record<FrameKind, Geometry> = {
  phone: { l: 0.035, r: 0.035, t: 0.035, b: 0.035, bodyR: 0.15, screenR: 0.118 },
  "phone-android": { l: 0.03, r: 0.03, t: 0.03, b: 0.03, bodyR: 0.1, screenR: 0.075 },
  tablet: { l: 0.04, r: 0.04, t: 0.04, b: 0.04, bodyR: 0.06, screenR: 0.03 },
  watch: { l: 0.09, r: 0.14, t: 0.11, b: 0.11, bodyR: 0.3, screenR: 0.2 },
  "watch-round": { l: 0.08, r: 0.08, t: 0.08, b: 0.08, bodyR: 0.5, screenR: 0.42 },
  laptop: { l: 0.09, r: 0.09, t: 0.025, b: 0.08, bodyR: 0.02, screenR: 0.004 },
  tv: { l: 0.012, r: 0.012, t: 0.012, b: 0.062, bodyR: 0.006, screenR: 0.002 },
  browser: { l: 0.006, r: 0.006, t: 0.05, b: 0.006, bodyR: 0.015, screenR: 0.004 },
  none: { l: 0, r: 0, t: 0, b: 0, bodyR: 0, screenR: 0 },
};

export const FRAME_LABELS: Record<FrameKind, string> = {
  phone: "Phone (island)",
  "phone-android": "Phone (punch hole)",
  tablet: "Tablet",
  watch: "Watch (square)",
  "watch-round": "Watch (round)",
  laptop: "Laptop",
  tv: "TV",
  browser: "Browser window",
  none: "No frame",
};

export function screenRect(kind: FrameKind, x: number, y: number, w: number, h: number, noneRadius = 0) {
  const g = GEO[kind];
  return {
    x: x + g.l * w,
    y: y + g.t * w,
    w: w * (1 - g.l - g.r),
    h: h - w * (g.t + g.b),
    r: kind === "none" ? noneRadius : g.screenR * w,
    round: kind === "watch-round",
  };
}

/** Frame height for a given width so the screen keeps the screenshot's aspect ratio. */
export function frameHeight(kind: FrameKind, w: number, screenAspect: number) {
  if (kind === "watch-round") return w;
  const g = GEO[kind];
  return (w * (1 - g.l - g.r)) / screenAspect + w * (g.t + g.b);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

function shade(color: string, amount: number) {
  // amount -1..1, darken/lighten a hex colour; falls back to the input.
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const f = (v: number) => Math.round(Math.min(255, Math.max(0, amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Draws the frame body (the part that casts a shadow). The screen is drawn by the caller, then drawFrameDetails. */
export function drawFrameBody(ctx: CanvasRenderingContext2D, kind: FrameKind, x: number, y: number, w: number, h: number, color: string) {
  const g = GEO[kind];
  ctx.fillStyle = color;
  switch (kind) {
    case "none":
      return;
    case "watch": {
      const bw = w * 0.95;
      // crown and button sit outside the body, on the right
      ctx.fillStyle = shade(color, -0.2);
      rr(ctx, x + bw - w * 0.01, y + h * 0.3, w * 0.06, h * 0.14, w * 0.02);
      ctx.fill();
      rr(ctx, x + bw - w * 0.01, y + h * 0.52, w * 0.04, h * 0.16, w * 0.015);
      ctx.fill();
      ctx.fillStyle = color;
      rr(ctx, x, y, bw, h, g.bodyR * w);
      ctx.fill();
      return;
    }
    case "watch-round":
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "laptop": {
      const lidX = x + w * 0.07, lidW = w * 0.86, baseH = w * 0.045;
      rr(ctx, lidX, y, lidW, h - baseH, g.bodyR * w);
      ctx.fill();
      // base: a flat slab, slightly lighter, with a notch
      ctx.fillStyle = shade(color === "#111111" ? "#3a3a3c" : color, 0.15);
      ctx.beginPath();
      ctx.moveTo(x, y + h - baseH);
      ctx.lineTo(x + w, y + h - baseH);
      ctx.lineTo(x + w * 0.985, y + h);
      ctx.lineTo(x + w * 0.015, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(color, -0.3);
      rr(ctx, x + w * 0.43, y + h - baseH, w * 0.14, baseH * 0.35, baseH * 0.2);
      ctx.fill();
      return;
    }
    case "tv": {
      const standH = w * 0.05;
      rr(ctx, x, y, w, h - standH, g.bodyR * w);
      ctx.fill();
      ctx.fillStyle = shade(color, -0.15);
      ctx.fillRect(x + w * 0.47, y + h - standH, w * 0.06, standH * 0.7);
      rr(ctx, x + w * 0.38, y + h - standH * 0.3, w * 0.24, standH * 0.3, standH * 0.1);
      ctx.fill();
      return;
    }
    case "phone": {
      // side buttons poke out slightly
      ctx.fillStyle = shade(color, -0.25);
      const bw = w * 0.012;
      rr(ctx, x - bw * 0.6, y + h * 0.17, bw, h * 0.04, bw / 2); ctx.fill();
      rr(ctx, x - bw * 0.6, y + h * 0.24, bw, h * 0.07, bw / 2); ctx.fill();
      rr(ctx, x - bw * 0.6, y + h * 0.33, bw, h * 0.07, bw / 2); ctx.fill();
      rr(ctx, x + w - bw * 0.4, y + h * 0.27, bw, h * 0.1, bw / 2); ctx.fill();
      ctx.fillStyle = color;
      rr(ctx, x, y, w, h, g.bodyR * w);
      ctx.fill();
      return;
    }
    default:
      rr(ctx, x, y, w, h, g.bodyR * w);
      ctx.fill();
  }
}

/** Rim highlight, camera cut-outs and browser chrome, drawn over the screen. */
export function drawFrameDetails(ctx: CanvasRenderingContext2D, kind: FrameKind, x: number, y: number, w: number, h: number, color: string) {
  const s = screenRect(kind, x, y, w, h);
  const g = GEO[kind];
  if (kind === "none") return;
  // subtle metallic rim
  ctx.save();
  ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.strokeStyle = shade(color, 0.35);
  ctx.globalAlpha = 0.6;
  if (kind === "watch-round") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2 - ctx.lineWidth, h / 2 - ctx.lineWidth, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "phone" || kind === "phone-android" || kind === "tablet") {
    rr(ctx, x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, g.bodyR * w);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "#000";
  if (kind === "phone") {
    const pw = s.w * 0.3, ph = s.w * 0.085;
    rr(ctx, s.x + (s.w - pw) / 2, s.y + s.w * 0.03, pw, ph, ph / 2);
    ctx.fill();
  } else if (kind === "phone-android") {
    const r = s.w * 0.028;
    ctx.beginPath();
    ctx.arc(s.x + s.w / 2, s.y + s.w * 0.045, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "laptop") {
    const cw = w * 0.006;
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + w * 0.0125, cw, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "browser") {
    ctx.save();
    ctx.fillStyle = shade(color, 0.08);
    rr(ctx, x, y, w, s.y - y + 2, g.bodyR * w);
    ctx.fill();
    const r = w * 0.007, cy = y + (s.y - y) / 2;
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + w * 0.02 + i * r * 3.2, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = shade(color, -0.12);
    rr(ctx, x + w * 0.25, cy - r * 1.6, w * 0.5, r * 3.2, r * 1.6);
    ctx.fill();
    ctx.restore();
  }
}
