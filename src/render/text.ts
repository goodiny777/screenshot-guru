import type { TextLayer } from "../model/types";
import { paintStyle } from "./paint";

type Run = { text: string; hl: boolean };
type Line = { runs: Run[]; width: number };

/** Split "Track **every** habit" into runs; ** toggles the highlight. */
export function parseRuns(src: string): Run[] {
  const parts = src.split("**");
  return parts.map((text, i) => ({ text, hl: i % 2 === 1 })).filter((r) => r.text.length > 0);
}

export function fontString(l: Pick<TextLayer, "italic" | "weight" | "font">, size: number) {
  return `${l.italic ? "italic " : ""}${l.weight} ${size}px "${l.font}", system-ui, sans-serif`;
}

// ---------------------------------------------------------------------------
// Right-to-left lines. Words are drawn one by one so each can be highlighted,
// which means the canvas cannot order them for us: we put the runs of a line in
// visual order here. This covers what store copy needs (Hebrew or Arabic with
// Latin names, numbers and punctuation), not the whole Unicode bidi algorithm.
// ---------------------------------------------------------------------------

// Hebrew and Arabic, including their presentation forms.
const RTL_CHARS = /[\p{Script=Hebrew}\p{Script=Arabic}]/u;
const LETTER = /\p{L}/u;
const RTL_LOCALE = /^(ar|fa|he|iw|ur)([-_]|$)/i;

/** True when a text block should be laid out right-to-left. */
export function isRtlText(text: string, locale = "") {
  if (!RTL_CHARS.test(text)) return false;
  if (RTL_LOCALE.test(locale)) return true;
  const first = LETTER.exec(text)?.[0] ?? "";
  return RTL_CHARS.test(first);
}

export type VisualRun = Run & { dir: "ltr" | "rtl" };
type Kind = "ltr" | "rtl" | "number" | "neutral";

function kindOf(text: string): Kind {
  if (RTL_CHARS.test(text)) return "rtl";
  if (LETTER.test(text)) return "ltr";
  return /\p{N}/u.test(text) ? "number" : "neutral";
}

/** Cut punctuation off the edges of a Latin word, so it can follow the right-to-left line. */
function splitEdges(run: Run): Run[] {
  if (kindOf(run.text) !== "ltr") return [run];
  const [, head, core, tail] = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}%+]*)$/su.exec(run.text)!;
  return [head, core, tail].filter(Boolean).map((text) => ({ text, hl: run.hl }));
}

/**
 * Runs of a right-to-left line, in the order to draw them from left to right.
 * Latin words (with the spaces and numbers between or after them) keep their own order.
 */
export function visualRuns(runs: Run[]): VisualRun[] {
  const parts = runs.flatMap(splitEdges);
  const kinds = parts.map((r) => kindOf(r.text));
  const units: VisualRun[][] = [];
  for (let i = 0; i < parts.length; i++) {
    if (kinds[i] !== "ltr") {
      units.push([{ ...parts[i], dir: "rtl" }]);
      continue;
    }
    let end = i;
    for (let j = i + 1; j < parts.length && kinds[j] !== "rtl"; j++) {
      if (kinds[j] === "ltr" || kinds[j] === "number") end = j;
    }
    units.push(parts.slice(i, end + 1).map((r) => ({ ...r, dir: "ltr" as const })));
    i = end;
  }
  return units.reverse().flat();
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Word-wrap text into lines that fit maxWidth. Keeps highlight runs intact across wraps. */
function layout(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Line[] {
  const lines: Line[] = [];
  for (const para of text.split("\n")) {
    // Tokens keep their highlight flag; whitespace becomes its own token so we can drop it at wraps.
    const tokens: Run[] = [];
    for (const run of parseRuns(para)) {
      for (const piece of run.text.split(/(\s+)/)) if (piece) tokens.push({ text: piece, hl: run.hl });
    }
    let cur: Run[] = [];
    let width = 0;
    const push = () => {
      while (cur.length && /^\s+$/.test(cur[cur.length - 1].text)) {
        width -= ctx.measureText(cur[cur.length - 1].text).width;
        cur.pop();
      }
      lines.push({ runs: cur, width });
      cur = [];
      width = 0;
    };
    for (const t of tokens) {
      const tw = ctx.measureText(t.text).width;
      const isSpace = /^\s+$/.test(t.text);
      if (width + tw > maxWidth && cur.length && !isSpace) push();
      if (isSpace && !cur.length) continue;
      cur.push(t);
      width += tw;
    }
    push();
  }
  return lines;
}

export function measureText(ctx: CanvasRenderingContext2D, l: TextLayer, text: string, size: number) {
  ctx.font = fontString(l, size);
  setSpacing(ctx, (l.letterSpacing ?? 0) * size);
  const lines = layout(ctx, l.uppercase ? text.toUpperCase() : text, l.w);
  const lh = size * (l.lineHeight ?? 1.1);
  return { lines, height: lines.length * lh, lineHeight: lh };
}

/** Largest font size (down to 40%) whose wrapped text fits the box. */
export function fittedSize(ctx: CanvasRenderingContext2D, l: TextLayer, text: string) {
  if (!l.autoFit) return l.size;
  let size = l.size;
  const min = l.size * 0.4;
  while (size > min) {
    const m = measureText(ctx, l, text, size);
    const widest = Math.max(0, ...m.lines.map((x) => x.width));
    if (m.height <= l.h && widest <= l.w + 0.5) break;
    size *= 0.95;
  }
  return size;
}

export function drawText(ctx: CanvasRenderingContext2D, l: TextLayer, text: string, locale = "") {
  const size = fittedSize(ctx, l, text);
  const { lines, height, lineHeight } = measureText(ctx, l, text, size);
  const fill = paintStyle(ctx, l.fill, l.x, l.y, l.w, l.h);
  const hl = l.highlight ?? "#ff3b6b";
  const style = l.highlightStyle ?? "color";
  let y = l.y;
  if (l.vAlign === "middle") y += (l.h - height) / 2;
  else if (l.vAlign === "bottom") y += l.h - height;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const ascent = size * 0.8;
  const rtl = isRtlText(text, locale);

  for (const line of lines) {
    const runs: (Run & { dir?: "ltr" | "rtl" })[] = rtl ? visualRuns(line.runs) : line.runs;
    let x = l.x;
    if (l.align === "center") x += (l.w - line.width) / 2;
    else if (l.align === "right") x += l.w - line.width;
    const base = y + (lineHeight - size) / 2 + ascent;

    // Backgrounds for marker / pill highlights first, so text sits on top.
    if (style !== "color") {
      let bx = x;
      const savedShadow = ctx.shadowColor;
      ctx.shadowColor = "transparent";
      for (const r of runs) {
        const t = l.uppercase ? r.text.toUpperCase() : r.text;
        const rw = ctx.measureText(t).width;
        if (r.hl && !/^\s+$/.test(t)) {
          ctx.fillStyle = hl;
          ctx.beginPath();
          if (style === "pill") ctx.roundRect(bx - size * 0.08, base - ascent - size * 0.04, rw + size * 0.16, size * 1.08, size * 0.24);
          else ctx.rect(bx - size * 0.05, base - size * 0.32, rw + size * 0.1, size * 0.38);
          ctx.fill();
        }
        bx += rw;
      }
      ctx.shadowColor = savedShadow;
    }

    for (const r of runs) {
      const t = l.uppercase ? r.text.toUpperCase() : r.text;
      const rw = ctx.measureText(t).width;
      if (r.dir) ctx.direction = r.dir;
      ctx.fillStyle = r.hl && style === "color" ? hl : fill;
      if (l.stroke && l.stroke.width > 0) {
        ctx.lineJoin = "round";
        ctx.lineWidth = l.stroke.width * 2;
        ctx.strokeStyle = l.stroke.color;
        ctx.strokeText(t, x, base);
      }
      ctx.fillText(t, x, base);
      x += rw;
    }
    y += lineHeight;
  }
  setSpacing(ctx, 0);
  if (rtl) ctx.direction = "inherit";
}
