import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getDevice } from "../model/devices";
import { ensureFonts } from "../model/fonts";
import { newDevice, newImage } from "../model/defaults";
import type { Deck, Layer } from "../model/types";
import { renderDeck, localizedText } from "../render/renderer";
import { onAssetsChanged, assetSize } from "../store/assets";
import { addImageFile } from "../store/io";
import { deckSize, getState, select, setUi, update, updateLayer, useStore } from "../store/store";

type Drag =
  | { kind: "move"; slide: number; id: string; sx: number; sy: number; x0: number; y0: number }
  | { kind: "resize"; slide: number; id: string; corner: string; sx: number; sy: number; l0: Layer; keep: boolean }
  | { kind: "rotate"; slide: number; id: string; cx: number; cy: number };

/** Is point (px,py) inside the layer box, taking rotation into account? */
function hit(l: Layer, px: number, py: number) {
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  const a = (-(l.rotation ?? 0) * Math.PI) / 180;
  const dx = px - cx, dy = py - cy;
  const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(rx) <= l.w / 2 && Math.abs(ry) <= l.h / 2;
}

export function Stage() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const zoomPref = useStore((s) => s.zoom);
  const showSafe = useStore((s) => s.showSafe);
  const deck = project.decks[project.activeDevice] as Deck | undefined;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wrapH, setWrapH] = useState(600);
  const [tick, setTick] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [guides, setGuides] = useState<{ v?: number; h?: number }>({});
  const [dropping, setDropping] = useState(false);

  const size = deck ? deckSize(deck) : { w: 1, h: 1 };
  const n = deck?.slides.length ?? 0;
  const fit = Math.max(0.02, (wrapH - 130) / size.h);
  const scale = zoomPref > 0 ? zoomPref : fit;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapH(el.clientHeight));
    ro.observe(el);
    setWrapH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => onAssetsChanged(() => setTick((t) => t + 1)), []);

  // Load fonts used in this deck, then redraw.
  const fontKey = useMemo(() => {
    if (!deck) return "";
    const specs = new Map<string, { font: string; weight: number; italic?: boolean; text: string }>();
    for (const s of deck.slides)
      for (const l of s.layers)
        if (l.type === "text") {
          const k = `${l.font}|${l.weight}|${l.italic}`;
          const prev = specs.get(k);
          const t = localizedText(l.text, project.activeLocale, project.locales[0]);
          specs.set(k, { font: l.font, weight: l.weight, italic: l.italic, text: (prev?.text ?? "") + t });
        }
    return JSON.stringify([...specs.values()]);
  }, [deck, project.activeLocale, project.locales]);
  useEffect(() => {
    if (!fontKey) return;
    let live = true;
    void ensureFonts(JSON.parse(fontKey)).then(() => live && setTick((t) => t + 1));
    return () => { live = false; };
  }, [fontKey]);

  // Draw
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !deck) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(size.w * n * scale), ch = Math.round(size.h * scale);
    c.style.width = `${cw}px`;
    c.style.height = `${ch}px`;
    c.width = Math.round(cw * dpr);
    c.height = Math.round(ch * dpr);
    const ctx = c.getContext("2d", { alpha: false })!;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    renderDeck(ctx, deck, { locale: project.activeLocale, fallbackLocale: project.locales[0], slideW: size.w, slideH: size.h, placeholders: true });
  }, [deck, scale, size.w, size.h, n, project.activeLocale, project.locales, tick]);

  if (!deck) return <div className="empty">Pick a device to start.</div>;
  const spec = getDevice(deck.device);

  const toDesign = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const pick = (x: number, y: number) => {
    for (let i = n - 1; i >= 0; i--) {
      const layers = deck.slides[i].layers;
      for (let j = layers.length - 1; j >= 0; j--) {
        const l = layers[j];
        if (l.hidden || l.locked) continue;
        if (hit(l, x - i * size.w, y)) return { slide: i, layer: l };
      }
    }
    return null;
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toDesign(e);
    const found = pick(p.x, p.y);
    if (!found) {
      select(Math.max(0, Math.min(n - 1, Math.floor(p.x / size.w))), null);
      return;
    }
    select(found.slide, found.layer.id);
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ kind: "move", slide: found.slide, id: found.layer.id, sx: p.x, sy: p.y, x0: found.layer.x, y0: found.layer.y });
  };

  const startHandle = (e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    const l = deck.slides[selection.slide]?.layers.find((x) => x.id === selection.layer);
    if (!l) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toDesign(e);
    if (corner === "rot") {
      setDrag({ kind: "rotate", slide: selection.slide, id: l.id, cx: selection.slide * size.w + l.x + l.w / 2, cy: l.y + l.h / 2 });
    } else {
      const keep = l.type === "device" || l.type === "image" || e.shiftKey;
      setDrag({ kind: "resize", slide: selection.slide, id: l.id, corner, sx: p.x, sy: p.y, l0: structuredClone(l), keep });
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toDesign(e);
    if (drag.kind === "move") {
      let x = drag.x0 + (p.x - drag.sx), y = drag.y0 + (p.y - drag.sy);
      const l = deck.slides[drag.slide].layers.find((q) => q.id === drag.id)!;
      // snap layer centre to slide centre lines
      const snap = 10 / scale;
      const g: { v?: number; h?: number } = {};
      if (!e.altKey) {
        if (Math.abs(x + l.w / 2 - size.w / 2) < snap) { x = size.w / 2 - l.w / 2; g.v = drag.slide * size.w + size.w / 2; }
        if (Math.abs(y + l.h / 2 - size.h / 2) < snap) { y = size.h / 2 - l.h / 2; g.h = size.h / 2; }
        if (Math.abs(x) < snap) x = 0;
        if (Math.abs(x + l.w - size.w) < snap) x = size.w - l.w;
      }
      setGuides(g);
      updateLayer(drag.slide, drag.id, { x, y }, `drag:${drag.id}`);
    } else if (drag.kind === "rotate") {
      let deg = (Math.atan2(p.y - drag.cy, p.x - drag.cx) * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      else if (Math.abs(deg % 90) < 3) deg = Math.round(deg / 90) * 90;
      updateLayer(drag.slide, drag.id, { rotation: Math.round(deg * 10) / 10 }, `rot:${drag.id}`);
    } else {
      // resize in the layer's own (unrotated) frame
      const l0 = drag.l0;
      const a = (-(l0.rotation ?? 0) * Math.PI) / 180;
      const dx0 = p.x - drag.sx, dy0 = p.y - drag.sy;
      const dx = dx0 * Math.cos(a) - dy0 * Math.sin(a), dy = dx0 * Math.sin(a) + dy0 * Math.cos(a);
      const sxs = drag.corner.includes("e") ? 1 : -1, sys = drag.corner.includes("s") ? 1 : -1;
      let w = Math.max(10, l0.w + dx * sxs), h = Math.max(10, l0.h + dy * sys);
      if (drag.keep) {
        const r = l0.w / l0.h;
        if (w / r > h) h = w / r; else w = h * r;
      }
      // keep the opposite corner fixed (approximately, ignoring rotation drift)
      const x = sxs > 0 ? l0.x : l0.x + l0.w - w;
      const y = sys > 0 ? l0.y : l0.y + l0.h - h;
      const patch: Partial<Layer> = { x, y, w, h };
      if (l0.type === "text" && e.altKey) (patch as { size: number }).size = l0.size * (w / l0.w);
      updateLayer(drag.slide, drag.id, patch, `resize:${drag.id}`);
    }
  };

  const onUp = () => {
    if (drag?.kind === "move") {
      // If the layer's centre ended on another slide, hand it over to that slide.
      const d = getState().project.decks[getState().project.activeDevice]!;
      const l = d.slides[drag.slide].layers.find((q) => q.id === drag.id);
      if (l) {
        const cx = drag.slide * size.w + l.x + l.w / 2;
        const target = Math.floor(cx / size.w);
        if (target !== drag.slide && target >= 0 && target < n) {
          update((p) => {
            const dk = p.decks[p.activeDevice]!;
            const from = dk.slides[drag.slide];
            const idx = from.layers.findIndex((q) => q.id === drag.id);
            const [moved] = from.layers.splice(idx, 1);
            moved.x += (drag.slide - target) * size.w;
            dk.slides[target].layers.push(moved);
          }, `drag:${drag.id}`);
          select(target, drag.id);
        }
      }
    }
    setDrag(null);
    setGuides({});
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const p = toDesign(e);
    const found = pick(p.x, p.y);
    let slide = Math.max(0, Math.min(n - 1, Math.floor(p.x / size.w)));
    for (const file of files) {
      const id = await addImageFile(file);
      if (found?.layer.type === "device" && files.length === 1) {
        updateLayer(found.slide, found.layer.id, (l) => {
          if (l.type !== "device") return;
          const loc = getState().project.activeLocale, base = getState().project.locales[0];
          if (loc !== base && l.asset) l.assets = { ...(l.assets ?? {}), [loc]: id };
          else l.asset = id;
        });
        return;
      }
      update((pr) => {
        const dk = pr.decks[pr.activeDevice]!;
        const s = dk.slides[slide];
        const empty = s.layers.find((l) => l.type === "device" && !l.asset);
        if (empty && empty.type === "device") empty.asset = id;
        else {
          const sz = assetSize(id) ?? { w: 600, h: 600 };
          const w = Math.min(size.w * 0.6, sz.w);
          s.layers.push(sz.h / sz.w > 1.6 ? newDevice(dk.device, size.w, size.h, { asset: id }) : newImage(id, w, (w * sz.h) / sz.w, { x: p.x - slide * size.w - w / 2, y: p.y - (w * sz.h) / sz.w / 2 }));
        }
      });
      slide = Math.min(n - 1, slide + 1);
    }
  };

  const sel = deck.slides[selection.slide]?.layers.find((l) => l.id === selection.layer);
  const zoomBy = (f: number) => setUi({ zoom: Math.max(0.03, Math.min(2, scale * f)) });

  return (
    <div
      className={`stage-wrap${dropping ? " dropping" : ""}`}
      ref={wrapRef}
      onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <div className="stage" style={{ marginTop: 56 }}>
        {deck.slides.map((_, i) => (
          <div key={i} className={`slide-num${i === selection.slide ? " active" : ""}`} style={{ left: i * size.w * scale }}>
            <span>{i + 1}</span>
          </div>
        ))}
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onDoubleClick={() => sel?.type === "text" && document.getElementById("text-editor")?.focus()}
          style={{ cursor: drag ? "grabbing" : "default", touchAction: "none" }}
        />
        {deck.slides.slice(1).map((_, i) => (
          <div key={i} className="divider" style={{ left: (i + 1) * size.w * scale }} />
        ))}
        {showSafe && spec.safe &&
          deck.slides.map((_, i) => {
            const s = spec.safe!;
            const boxes = [] as { l: number; t: number; w: number; h: number }[];
            if (s.left) boxes.push({ l: 0, t: 0, w: s.left, h: size.h });
            if (s.right) boxes.push({ l: size.w - s.right, t: 0, w: s.right, h: size.h });
            if (s.top) boxes.push({ l: 0, t: 0, w: size.w, h: s.top });
            if (s.bottom) boxes.push({ l: 0, t: size.h - s.bottom, w: size.w, h: s.bottom });
            return boxes.map((b, k) => (
              <div key={`${i}-${k}`} className="safe" title={s.note} style={{ left: (i * size.w + b.l) * scale, top: b.t * scale, width: b.w * scale, height: b.h * scale }} />
            ));
          })}
        {guides.v !== undefined && <div className="guide" style={{ left: guides.v * scale, top: 0, width: 1, height: size.h * scale }} />}
        {guides.h !== undefined && <div className="guide" style={{ top: guides.h * scale, left: selection.slide * size.w * scale, height: 1, width: size.w * scale }} />}
        {sel && !sel.locked && (
          <div
            className="sel"
            style={{
              left: (selection.slide * size.w + sel.x) * scale,
              top: sel.y * scale,
              width: sel.w * scale,
              height: sel.h * scale,
              transform: `rotate(${sel.rotation ?? 0}deg)`,
            }}
          >
            {["nw", "ne", "sw", "se", "rot"].map((c) => (
              <div key={c} className={`h ${c}`} onPointerDown={(e) => startHandle(e, c)} onPointerMove={onMove} onPointerUp={onUp} />
            ))}
          </div>
        )}
      </div>
      <div className="stage-tools">
        <button className="ghost" onClick={() => zoomBy(1 / 1.25)} title="Zoom out">−</button>
        <button className="ghost" onClick={() => setUi({ zoom: 0 })} title="Fit height">{Math.round(scale * 100)}%</button>
        <button className="ghost" onClick={() => zoomBy(1.25)} title="Zoom in">+</button>
        {spec.safe && <button className={showSafe ? "on" : "ghost"} onClick={() => setUi({ showSafe: !showSafe })} title={spec.safe.note}>Safe areas</button>}
        <span className="muted small" style={{ alignSelf: "center", padding: "0 6px" }}>
          {spec.label} · {size.w}×{size.h} · drop images onto slides
        </span>
      </div>
    </div>
  );
}
