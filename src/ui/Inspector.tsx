import { getDevice } from "../model/devices";
import { FONTS, nearestWeight } from "../model/fonts";
import { screenAspect, uid } from "../model/defaults";
import type { BlendMode, DeviceLayer, FrameKind, ImageLayer, Layer, ShapeLayer, TextLayer } from "../model/types";
import { FRAME_LABELS, frameHeight } from "../render/frames";
import { STYLES, buildDeck, extractRecipe, restyleDeck } from "../model/templates";
import { addImageFile } from "../store/io";
import { assetSize, putAsset, registerFont } from "../store/assets";
import { deckSize, select, update, updateLayer, useStore } from "../store/store";
import { BackgroundEditor, Check, Color, Field, Num, PaintEditor, Select, Slider } from "./controls";
import { pickFile } from "./LeftPanel";
import { markCustomFont } from "../model/fonts";

const BLENDS: BlendMode[] = ["source-over", "multiply", "screen", "overlay", "soft-light", "hard-light", "color-dodge", "lighten", "darken", "difference"];
const FRAME_COLORS = ["#111111", "#1c1c1e", "#f5f5f7", "#c9b99a", "#3a4a5c", "#5b6b4f", "#7c3aed", "#e0408a"];

export function Inspector() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const deck = project.decks[project.activeDevice];
  if (!deck) return <aside className="right" />;
  const layer = deck.slides[selection.slide]?.layers.find((l) => l.id === selection.layer);
  return <aside className="right">{layer ? <LayerInspector layer={layer} slide={selection.slide} /> : <DeckInspector slide={selection.slide} />}</aside>;
}

function LayerInspector({ layer: l, slide }: { layer: Layer; slide: number }) {
  const set = (patch: Partial<Layer>) => updateLayer(slide, l.id, patch);
  const duplicate = () => {
    const copy = { ...structuredClone(l), id: uid(l.type[0]), x: l.x + 40, y: l.y + 40 };
    update((p) => { p.decks[p.activeDevice]!.slides[slide].layers.push(copy); });
    select(slide, copy.id);
  };
  const remove = () => {
    update((p) => {
      const s = p.decks[p.activeDevice]!.slides[slide];
      s.layers = s.layers.filter((x) => x.id !== l.id);
    });
    select(slide, null);
  };
  return (
    <>
      <div className="section">
        <div className="row">
          <input type="text" className="grow" value={l.name ?? ""} placeholder="Layer name" onChange={(e) => set({ name: e.target.value })} />
          <button onClick={duplicate} title="Duplicate (⌘D)">⧉</button>
          <button className="danger" onClick={remove} title="Delete (Del)">✕</button>
        </div>
      </div>
      {l.type === "text" && <TextProps l={l} slide={slide} />}
      {l.type === "device" && <DeviceProps l={l} slide={slide} />}
      {l.type === "image" && <ImageProps l={l} slide={slide} />}
      {l.type === "shape" && <ShapeProps l={l} slide={slide} />}
      <div className="section">
        <h3>Position</h3>
        <div className="grid2">
          <Num label="X" value={l.x} onChange={(x) => set({ x })} />
          <Num label="Y" value={l.y} onChange={(y) => set({ y })} />
          <Num label="Width" value={l.w} onChange={(w) => set({ w: Math.max(1, w) })} />
          <Num label="Height" value={l.h} onChange={(h) => set({ h: Math.max(1, h) })} />
        </div>
        <Slider label="Rotation" min={-180} max={180} step={0.5} value={l.rotation ?? 0} onChange={(rotation) => set({ rotation })} />
      </div>
      <div className="section">
        <h3>Effects</h3>
        <Slider label="Opacity" min={0} max={1} value={l.opacity ?? 1} onChange={(opacity) => set({ opacity })} />
        <Select label="Blend" value={l.blend ?? "source-over"} options={BLENDS.map((b) => [b, b === "source-over" ? "normal" : b] as [BlendMode, string])} onChange={(blend) => set({ blend })} />
        <Slider label="Blur" min={0} max={80} step={1} value={l.blur ?? 0} onChange={(blur) => set({ blur })} />
        <Check label="Shadow / glow" value={!!l.shadow} onChange={(on) => set({ shadow: on ? { color: "rgba(0,0,0,0.35)", blur: 60, x: 0, y: 24 } : undefined })} />
        {l.shadow && (
          <>
            <Color label="Shadow colour" value={l.shadow.color} onChange={(color) => set({ shadow: { ...l.shadow!, color } })} />
            <div className="grid2">
              <Slider label="Blur" min={0} max={300} step={1} value={l.shadow.blur} onChange={(blur) => set({ shadow: { ...l.shadow!, blur } })} />
              <Slider label="Y offset" min={-200} max={200} step={1} value={l.shadow.y} onChange={(y) => set({ shadow: { ...l.shadow!, y } })} />
              <Slider label="X offset" min={-200} max={200} step={1} value={l.shadow.x} onChange={(x) => set({ shadow: { ...l.shadow!, x } })} />
            </div>
            <span className="small muted">Tip: a coloured shadow with no offset gives a glow.</span>
          </>
        )}
      </div>
    </>
  );
}

function TextProps({ l, slide }: { l: TextLayer; slide: number }) {
  const project = useStore((s) => s.project);
  const set = (patch: Partial<TextLayer>, key?: string) => updateLayer(slide, l.id, patch as Partial<Layer>, key);
  const loc = project.activeLocale;
  const base = project.locales[0];
  const font = FONTS.find((f) => f.family === l.font);
  const customFonts = Object.keys(project.fonts ?? {});
  return (
    <>
      <div className="section">
        <h3>Text · {loc.toUpperCase()}</h3>
        <textarea
          id="text-editor"
          value={l.text[loc] ?? ""}
          placeholder={loc !== base ? `Translation of: ${l.text[base] ?? ""}` : "Type your headline"}
          dir={/^(ar|he|fa|ur)/.test(loc) ? "rtl" : "ltr"}
          onChange={(e) => set({ text: { ...l.text, [loc]: e.target.value } }, `text:${l.id}`)}
        />
        <span className="small muted">Wrap words in **double stars** to highlight them.</span>
        {loc !== base && <span className="small muted">Original ({base}): {l.text[base]}</span>}
      </div>
      <div className="section">
        <h3>Type</h3>
        <Field label="Font">
          <select value={l.font} onChange={(e) => set({ font: e.target.value, weight: nearestWeight(e.target.value, l.weight) })}>
            {customFonts.length > 0 && <optgroup label="Uploaded">{customFonts.map((f) => <option key={f}>{f}</option>)}</optgroup>}
            {(["sans", "display", "serif", "hand"] as const).map((cat) => (
              <optgroup key={cat} label={cat}>
                {FONTS.filter((f) => f.category === cat).map((f) => <option key={f.family}>{f.family}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <button onClick={async () => {
          const f = await pickFile(".ttf,.otf,.woff,.woff2");
          if (!f) return;
          const family = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
          const id = `font-${Date.now().toString(36)}`;
          await putAsset(id, new Blob([await f.arrayBuffer()], { type: "font/" + (f.name.split(".").pop() ?? "ttf") }));
          markCustomFont(family);
          if (await registerFont(family, id)) {
            update((p) => { p.fonts = { ...(p.fonts ?? {}), [family]: id }; });
            set({ font: family });
          }
        }}>Upload font file…</button>
        <div className="grid2">
          <Select label="Weight" value={String(l.weight)} options={(font?.weights ?? [300, 400, 500, 600, 700, 800, 900]).map(String)} onChange={(w) => set({ weight: Number(w) })} />
          <Num label="Size" value={l.size} onChange={(size) => set({ size: Math.max(4, size) })} />
          <Num label="Line height" step={0.02} value={l.lineHeight ?? 1.1} onChange={(lineHeight) => set({ lineHeight })} />
          <Num label="Letter spacing" step={0.005} value={l.letterSpacing ?? 0} onChange={(letterSpacing) => set({ letterSpacing })} />
        </div>
        <div className="grid2">
          <Select label="Align" value={l.align ?? "left"} options={["left", "center", "right"]} onChange={(align) => set({ align })} />
          <Select label="Vertical" value={l.vAlign ?? "top"} options={["top", "middle", "bottom"]} onChange={(vAlign) => set({ vAlign })} />
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <Check label="Italic" value={!!l.italic} onChange={(italic) => set({ italic })} />
          <Check label="UPPERCASE" value={!!l.uppercase} onChange={(uppercase) => set({ uppercase })} />
          <Check label="Shrink to fit" value={!!l.autoFit} onChange={(autoFit) => set({ autoFit })} />
        </div>
      </div>
      <div className="section">
        <h3>Fill</h3>
        <PaintEditor value={l.fill} onChange={(fill) => set({ fill })} />
      </div>
      <div className="section">
        <h3>Highlight</h3>
        <Color value={l.highlight ?? "#ff3b6b"} onChange={(highlight) => set({ highlight })} />
        <Select value={l.highlightStyle ?? "color"} options={[["color", "Coloured words"], ["marker", "Marker underline"], ["pill", "Pill behind words"]]} onChange={(highlightStyle) => set({ highlightStyle })} />
        <Check label="Outline" value={!!l.stroke} onChange={(on) => set({ stroke: on ? { color: "#000000", width: Math.max(2, l.size * 0.04) } : undefined })} />
        {l.stroke && (
          <div className="grid2">
            <Color value={l.stroke.color} onChange={(color) => set({ stroke: { ...l.stroke!, color } })} />
            <Num value={l.stroke.width} onChange={(width) => set({ stroke: { ...l.stroke!, width } })} />
          </div>
        )}
      </div>
    </>
  );
}

function DeviceProps({ l, slide }: { l: DeviceLayer; slide: number }) {
  const project = useStore((s) => s.project);
  const deck = project.decks[project.activeDevice]!;
  const set = (patch: Partial<DeviceLayer>) => updateLayer(slide, l.id, patch as Partial<Layer>);
  const loc = project.activeLocale, base = project.locales[0];
  const localized = loc !== base;
  const current = localized ? l.assets?.[loc] : l.asset;
  const choose = async () => {
    const f = await pickFile("image/*");
    if (!f) return;
    const id = await addImageFile(f);
    if (localized) set({ assets: { ...(l.assets ?? {}), [loc]: id } });
    else set({ asset: id });
  };
  const fitToShot = () => {
    const sz = assetSize(current || l.asset);
    const aspect = sz ? sz.w / sz.h : screenAspect(deck.device, l.frame);
    set({ h: frameHeight(l.frame, l.w, aspect) });
  };
  return (
    <>
      <div className="section">
        <h3>Screenshot{localized ? ` · ${loc.toUpperCase()}` : ""}</h3>
        <div className="grid2">
          <button className="primary" onClick={choose}>{current ? "Replace" : "Choose…"}</button>
          <button disabled={!current} onClick={() => (localized ? set({ assets: Object.fromEntries(Object.entries(l.assets ?? {}).filter(([k]) => k !== loc)) }) : set({ asset: "" }))}>Remove</button>
        </div>
        {localized && <span className="small muted">{current ? `Uses a ${loc} screenshot.` : `No ${loc} screenshot; showing the ${base} one.`}</span>}
        <span className="small muted">You can also drop an image straight onto the device.</span>
      </div>
      <div className="section">
        <h3>Frame</h3>
        <Select value={l.frame} options={(Object.keys(FRAME_LABELS) as FrameKind[]).map((k) => [k, FRAME_LABELS[k]] as [FrameKind, string])} onChange={(frame) => set({ frame })} />
        <Field label="Frame colour">
          <div className="swatch-row">
            {FRAME_COLORS.map((c) => <button key={c} className="swatch" style={{ background: c }} onClick={() => set({ frameColor: c })} />)}
          </div>
        </Field>
        <Color value={l.frameColor ?? "#111111"} onChange={(frameColor) => set({ frameColor })} />
        {l.frame === "none" && <Num label="Corner radius" value={l.radius ?? 0} onChange={(radius) => set({ radius })} />}
        <Check label="Screen glare" value={!!l.glare} onChange={(glare) => set({ glare })} />
        <button onClick={fitToShot}>Fit height to screenshot</button>
      </div>
    </>
  );
}

function ImageProps({ l, slide }: { l: ImageLayer; slide: number }) {
  const set = (patch: Partial<ImageLayer>) => updateLayer(slide, l.id, patch as Partial<Layer>);
  return (
    <div className="section">
      <h3>Image</h3>
      <button onClick={async () => { const f = await pickFile("image/*"); if (f) set({ asset: await addImageFile(f) }); }}>Replace image…</button>
      <div className="grid2">
        <Select label="Fit" value={l.fit ?? "cover"} options={["cover", "contain", "fill"]} onChange={(fit) => set({ fit })} />
        <Select label="Mask" value={l.mask ?? "none"} options={["none", "circle"]} onChange={(mask) => set({ mask })} />
      </div>
      <Num label="Corner radius" value={l.radius ?? 0} onChange={(radius) => set({ radius })} />
      <Check label="Fade an edge" value={!!l.fade} onChange={(on) => set({ fade: on ? { side: "bottom", amount: 0.4 } : undefined })} />
      {l.fade && (
        <div className="grid2">
          <Select value={l.fade.side} options={["top", "bottom", "left", "right"]} onChange={(side) => set({ fade: { ...l.fade!, side } })} />
          <Slider label="Amount" min={0.05} max={1} value={l.fade.amount} onChange={(amount) => set({ fade: { ...l.fade!, amount } })} />
        </div>
      )}
    </div>
  );
}

function ShapeProps({ l, slide }: { l: ShapeLayer; slide: number }) {
  const set = (patch: Partial<ShapeLayer>) => updateLayer(slide, l.id, patch as Partial<Layer>);
  return (
    <div className="section">
      <h3>Shape</h3>
      <Select value={l.shape} options={["rect", "ellipse", "star", "blob"]} onChange={(shape) => set({ shape })} />
      {l.shape === "rect" && <Num label="Corner radius" value={l.radius ?? 0} onChange={(radius) => set({ radius })} />}
      <PaintEditor value={l.fill} onChange={(fill) => set({ fill })} />
      <Check label="Outline" value={!!l.stroke} onChange={(on) => set({ stroke: on ? { color: "#ffffff", width: 6 } : undefined })} />
      {l.stroke && (
        <div className="grid2">
          <Color value={l.stroke.color} onChange={(color) => set({ stroke: { ...l.stroke!, color } })} />
          <Num value={l.stroke.width} onChange={(width) => set({ stroke: { ...l.stroke!, width } })} />
        </div>
      )}
    </div>
  );
}

function DeckInspector({ slide }: { slide: number }) {
  const project = useStore((s) => s.project);
  const deck = project.decks[project.activeDevice]!;
  const spec = getDevice(deck.device);
  const s = deck.slides[slide];
  const custom = !deck.spanBackground && !!s?.background;
  const setDeck = (fn: (d: typeof deck) => void) => update((p) => fn(p.decks[p.activeDevice]!), "deck");
  const { w, h } = deckSize(deck);
  return (
    <>
      <div className="section">
        <h3>{spec.label}</h3>
        <span className="small muted">{w} × {h} design canvas · {spec.sizes.length} export size{spec.sizes.length > 1 ? "s" : ""}</span>
        {spec.rotatable && (
          <Select label="Orientation" value={deck.orientation} options={["portrait", "landscape"]} onChange={(o) => update((p) => {
            const d = p.decks[p.activeDevice]!;
            p.decks[p.activeDevice] = buildDeck(d.template ?? "clean-light", d.device, { orientation: o, slides: extractRecipe(d, p.locales[0]), locale: p.locales[0], appName: p.name, icon: p.icon });
          })} />
        )}
        <Field label="Restyle with a template (keeps layout and copy)">
          <select value="" onChange={(e) => e.target.value && update((p) => { p.decks[p.activeDevice] = restyleDeck(p.decks[p.activeDevice]!, e.target.value); })}>
            <option value="">Choose a style…</option>
            {STYLES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 16 }}>
          {spec.rules.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
      <div className="section">
        <h3>Background</h3>
        <Check label="One background across all slides" value={deck.spanBackground} onChange={(v) => setDeck((d) => { d.spanBackground = v; })} />
        {!deck.spanBackground && (
          <Check label={`Custom background for slide ${slide + 1}`} value={custom} onChange={(v) => update((p) => {
            const sl = p.decks[p.activeDevice]!.slides[slide];
            sl.background = v ? structuredClone(p.decks[p.activeDevice]!.background) : undefined;
          })} />
        )}
        {custom ? (
          <BackgroundEditor value={s.background!} onChange={(b) => update((p) => { p.decks[p.activeDevice]!.slides[slide].background = b; }, "bg")} />
        ) : (
          <BackgroundEditor value={deck.background} onChange={(b) => setDeck((d) => { d.background = b; })} />
        )}
        {!deck.spanBackground && (
          <button onClick={() => update((p) => { p.decks[p.activeDevice]!.slides.forEach((x) => (x.background = undefined)); })}>Use deck background on every slide</button>
        )}
      </div>
      <ProjectSettings />
    </>
  );
}

function ProjectSettings() {
  const project = useStore((s) => s.project);
  return (
    <div className="section">
      <h3>App</h3>
      <Field label="App name">
        <input type="text" value={project.name} onChange={(e) => update((p) => { p.name = e.target.value; }, "name")} />
      </Field>
      <Field label="App icon">
        <div className="row">
          <button className="grow" onClick={async () => { const f = await pickFile("image/*"); if (f) { const id = await addImageFile(f); update((p) => { p.icon = id; }); } }}>{project.icon ? "Replace icon…" : "Upload icon…"}</button>
          {project.icon && <button onClick={() => update((p) => { p.icon = undefined; })}>✕</button>}
        </div>
      </Field>
      <span className="small muted">Select a layer on the canvas to edit it. Shortcuts: ⌘Z undo, ⇧⌘Z redo, ⌘D duplicate, Delete, arrows to nudge (Shift ×10).</span>
    </div>
  );
}
