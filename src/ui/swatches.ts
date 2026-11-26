import type { Paint } from "../model/types";

export const SWATCHES = ["#ffffff", "#0f172a", "#111111", "#f5f5f7", "#4f46e5", "#7c3aed", "#e0408a", "#ff3b6b", "#ff7a45", "#ffb547", "#c6ff00", "#22c55e", "#14b8a6", "#0ea5e9", "#2563eb"];

/** CSS preview of a Paint (for swatches and gradient bars). */
export function paintCss(p: Paint): string {
  if (p.type === "solid") return p.color;
  const stops = p.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
  return p.type === "linear" ? `linear-gradient(${p.angle}deg, ${stops})` : `radial-gradient(circle at ${p.cx * 100}% ${p.cy * 100}%, ${stops})`;
}
