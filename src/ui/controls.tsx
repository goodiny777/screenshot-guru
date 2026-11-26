import { useState, type ReactNode } from "react";
import type { Background, Paint, Pattern } from "../model/types";
import { SWATCHES, paintCss } from "./swatches";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field" title={hint}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Num({ value, onChange, step = 1, min, max, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; label?: string }) {
  const input = (
    <input
      type="number"
      value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
    />
  );
  return label ? <Field label={label}>{input}</Field> : input;
}

export function Slider({ value, onChange, min, max, step = 0.01, label }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string }) {
  return (
    <Field label={`${label}: ${Math.round(value * 100) / 100}`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </Field>
  );
}

const toHex = (c: string) => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + [...c.slice(1)].map((x) => x + x).join("");
  const m = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c);
  if (m) return "#" + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("");
  return "#000000";
};


export function Color({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const body = (
    <div className="row">
      <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    </div>
  );
  return label ? <Field label={label}>{body}</Field> : body;
}

export function Select<T extends string>({ value, options, onChange, label }: { value: T; options: (T | [T, string])[]; onChange: (v: T) => void; label?: string }) {
  const s = (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return <option key={v} value={v}>{t}</option>;
      })}
    </select>
  );
  return label ? <Field label={label}>{s}</Field> : s;
}

export function Check({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="row" style={{ color: "var(--text)", cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}


export function PaintEditor({ value, onChange }: { value: Paint; onChange: (p: Paint) => void }) {
  const stops = value.type === "solid" ? [{ offset: 0, color: value.color }, { offset: 1, color: value.color }] : value.stops;
  const setType = (t: Paint["type"]) => {
    if (t === "solid") onChange({ type: "solid", color: stops[0].color });
    else if (t === "linear") onChange({ type: "linear", angle: value.type === "linear" ? value.angle : 160, stops: value.type === "solid" ? [{ offset: 0, color: value.color }, { offset: 1, color: "#7c3aed" }] : stops });
    else onChange({ type: "radial", cx: 0.5, cy: 0.3, r: 0.9, stops: value.type === "solid" ? [{ offset: 0, color: value.color }, { offset: 1, color: "#000000" }] : stops });
  };
  return (
    <div className="field" style={{ gap: 6 }}>
      <div className="tabs">
        {(["solid", "linear", "radial"] as const).map((t) => (
          <button key={t} className={value.type === t ? "on" : ""} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>
      {value.type === "solid" ? (
        <>
          <Color value={value.color} onChange={(c) => onChange({ type: "solid", color: c })} />
          <div className="swatch-row">
            {SWATCHES.map((c) => <button key={c} className="swatch" style={{ background: c }} onClick={() => onChange({ type: "solid", color: c })} />)}
          </div>
        </>
      ) : (
        <>
          <div className="gradient-bar" style={{ background: paintCss({ ...value, type: "linear", angle: 90 } as Paint) }} />
          {value.type === "linear" ? (
            <Slider label="Angle" min={0} max={360} step={1} value={value.angle} onChange={(angle) => onChange({ ...value, angle })} />
          ) : (
            <div className="grid2">
              <Slider label="Centre X" min={0} max={1} value={value.cx} onChange={(cx) => onChange({ ...value, cx })} />
              <Slider label="Centre Y" min={0} max={1} value={value.cy} onChange={(cy) => onChange({ ...value, cy })} />
              <Slider label="Radius" min={0.1} max={2} value={value.r} onChange={(r) => onChange({ ...value, r })} />
            </div>
          )}
          <div className="stops">
            {value.stops.map((s, i) => (
              <div className="row" key={i}>
                <div className="grow"><Color value={s.color} onChange={(color) => onChange({ ...value, stops: value.stops.map((x, j) => (j === i ? { ...x, color } : x)) })} /></div>
                <input type="number" style={{ width: 54 }} min={0} max={100} value={Math.round(s.offset * 100)} onChange={(e) => onChange({ ...value, stops: value.stops.map((x, j) => (j === i ? { ...x, offset: Number(e.target.value) / 100 } : x)) })} />
                <button className="ghost" disabled={value.stops.length <= 2} onClick={() => onChange({ ...value, stops: value.stops.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button onClick={() => onChange({ ...value, stops: [...value.stops, { offset: 1, color: value.stops[value.stops.length - 1].color }].sort((a, b) => a.offset - b.offset) })}>+ Colour stop</button>
          </div>
        </>
      )}
    </div>
  );
}

export function BackgroundEditor({ value, onChange }: { value: Background; onChange: (b: Background) => void }) {
  const [open, setOpen] = useState(false);
  const pat = value.pattern ?? { type: "none" as Pattern, color: "#000000", opacity: 0.1, size: 60 };
  return (
    <div className="field" style={{ gap: 8 }}>
      <PaintEditor value={value.paint} onChange={(paint) => onChange({ ...value, paint })} />
      <button className="ghost" style={{ textAlign: "left" }} onClick={() => setOpen(!open)}>{open ? "▾" : "▸"} Light, pattern and texture</button>
      {open && (
        <>
          <h3 style={{ marginTop: 4 }}>Light orbs</h3>
          {(value.orbs ?? []).map((o, i) => (
            <div key={i} className="field" style={{ background: "var(--panel-2)", padding: 8, borderRadius: 6 }}>
              <div className="row">
                <div className="grow"><Color value={o.color} onChange={(color) => onChange({ ...value, orbs: value.orbs!.map((x, j) => (j === i ? { ...x, color } : x)) })} /></div>
                <button className="ghost" onClick={() => onChange({ ...value, orbs: value.orbs!.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <div className="grid2">
                <Slider label="X" min={-0.5} max={1.5} value={o.x} onChange={(x) => onChange({ ...value, orbs: value.orbs!.map((q, j) => (j === i ? { ...q, x } : q)) })} />
                <Slider label="Y" min={-0.5} max={1.5} value={o.y} onChange={(y) => onChange({ ...value, orbs: value.orbs!.map((q, j) => (j === i ? { ...q, y } : q)) })} />
                <Slider label="Size" min={0.05} max={1.5} value={o.r} onChange={(r) => onChange({ ...value, orbs: value.orbs!.map((q, j) => (j === i ? { ...q, r } : q)) })} />
                <Slider label="Strength" min={0} max={1} value={o.opacity} onChange={(opacity) => onChange({ ...value, orbs: value.orbs!.map((q, j) => (j === i ? { ...q, opacity } : q)) })} />
              </div>
            </div>
          ))}
          <button onClick={() => onChange({ ...value, orbs: [...(value.orbs ?? []), { x: 0.5, y: 0.3, r: 0.5, color: "#7c3aed", opacity: 0.5 }] })}>+ Light orb</button>
          <h3 style={{ marginTop: 4 }}>Pattern</h3>
          <Select value={pat.type} options={["none", "dots", "grid", "lines", "waves"]} onChange={(type) => onChange({ ...value, pattern: { ...pat, type } })} />
          {pat.type !== "none" && (
            <>
              <Color value={pat.color} onChange={(color) => onChange({ ...value, pattern: { ...pat, color } })} />
              <div className="grid2">
                <Slider label="Opacity" min={0} max={1} value={pat.opacity} onChange={(opacity) => onChange({ ...value, pattern: { ...pat, opacity } })} />
                <Slider label="Size" min={10} max={300} step={1} value={pat.size} onChange={(size) => onChange({ ...value, pattern: { ...pat, size } })} />
              </div>
            </>
          )}
          <h3 style={{ marginTop: 4 }}>Texture</h3>
          <div className="grid2">
            <Slider label="Grain" min={0} max={1} value={value.noise ?? 0} onChange={(noise) => onChange({ ...value, noise })} />
            <Slider label="Vignette" min={0} max={1} value={value.vignette ?? 0} onChange={(vignette) => onChange({ ...value, vignette })} />
          </div>
        </>
      )}
    </div>
  );
}

export function Dialog({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" style={wide ? { width: "min(1100px, 100%)" } : undefined} role="dialog" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

export function CopyBlock({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <pre className="code">
      {text}
      <button className="copy" onClick={() => { void navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}>{done ? "Copied" : "Copy"}</button>
    </pre>
  );
}
