import type { Background, Paint } from "../model/types";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Turn a Paint into a fillStyle for the given box. Linear angles follow CSS: 0 = to top, 90 = to right. */
export function paintStyle(ctx: Ctx, paint: Paint, x: number, y: number, w: number, h: number): string | CanvasGradient {
  if (paint.type === "solid") return paint.color;
  let g: CanvasGradient;
  if (paint.type === "linear") {
    const a = (paint.angle * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    const cx = x + w / 2, cy = y + h / 2;
    g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  } else {
    const cx = x + paint.cx * w, cy = y + paint.cy * h;
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, paint.r * Math.max(w, h)));
  }
  for (const s of paint.stops) g.addColorStop(Math.min(1, Math.max(0, s.offset)), s.color);
  return g;
}

/** First colour of a paint, handy for swatches and contrast checks. */
export function paintColor(paint: Paint): string {
  return paint.type === "solid" ? paint.color : paint.stops[0]?.color ?? "#000";
}

// Seeded noise tile so exports are identical every time.
let noiseTile: HTMLCanvasElement | null = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let seed = 1234567;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/** Scale factor between design px and the pattern/noise sizes, so a 384 px export still looks like the design. */
export function drawBackground(ctx: CanvasRenderingContext2D, bg: Background, x: number, y: number, w: number, h: number, unit: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = paintStyle(ctx, bg.paint, x, y, w, h);
  ctx.fillRect(x, y, w, h);

  for (const o of bg.orbs ?? []) {
    const cx = x + o.x * w, cy = y + o.y * h, r = Math.max(1, o.r * Math.max(w, h));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, o.color);
    g.addColorStop(1, transparent(o.color));
    ctx.globalAlpha = o.opacity;
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;

  const p = bg.pattern;
  if (p && p.type !== "none" && p.opacity > 0) {
    ctx.globalAlpha = p.opacity;
    ctx.strokeStyle = ctx.fillStyle = p.color;
    const s = Math.max(4, p.size) * unit;
    ctx.lineWidth = Math.max(1, s * 0.04);
    if (p.type === "dots") {
      for (let yy = y + s / 2; yy < y + h; yy += s)
        for (let xx = x + s / 2; xx < x + w; xx += s) {
          ctx.beginPath();
          ctx.arc(xx, yy, s * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
    } else if (p.type === "grid") {
      ctx.beginPath();
      for (let xx = x; xx < x + w; xx += s) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); }
      for (let yy = y; yy < y + h; yy += s) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
      ctx.stroke();
    } else if (p.type === "lines") {
      ctx.beginPath();
      for (let d = -h; d < w; d += s) { ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); }
      ctx.stroke();
    } else if (p.type === "waves") {
      ctx.beginPath();
      for (let yy = y; yy < y + h + s; yy += s) {
        ctx.moveTo(x, yy);
        for (let xx = x; xx <= x + w; xx += s / 4) ctx.lineTo(xx, yy + Math.sin((xx - x) / s * Math.PI) * s * 0.18);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (bg.noise && bg.noise > 0) {
    const pat = ctx.createPattern(getNoiseTile(), "repeat");
    if (pat) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = bg.noise * 0.35;
      ctx.fillStyle = pat;
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }

  if (bg.vignette && bg.vignette > 0) {
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.hypot(w, h) / 2;
    const g = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${0.6 * bg.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** Same colour with zero alpha; avoids grey fringes from fading to "transparent" black. */
export function transparent(color: string): string {
  const c = parseColor(color);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},0)` : "rgba(0,0,0,0)";
}

export function parseColor(color: string): [number, number, number, number] | null {
  const s = color.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return null;
}

/** Relative luminance, for WCAG contrast checks. */
export function luminance(color: string): number {
  const c = parseColor(color);
  if (!c) return 0;
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
