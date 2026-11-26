import { getDevice } from "../model/devices";
import { newDevice, newShape, newText, uid } from "../model/defaults";
import type { Layer } from "../model/types";
import { buildDeck } from "../model/templates";
import { addImageFile } from "../store/io";
import { assetSize } from "../store/assets";
import { deckSize, select, update, useStore } from "../store/store";
import { newImage } from "../model/defaults";
import { pickFile } from "./files";

const ICON: Record<Layer["type"], string> = { text: "T", image: "▣", device: "▯", shape: "◆" };


export function LeftPanel() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const deck = project.decks[project.activeDevice];
  if (!deck) return <aside className="left" />;
  const { w: W, h: H } = deckSize(deck);
  const spec = getDevice(deck.device);
  const slide = deck.slides[selection.slide];
  const locale = project.activeLocale;

  const addLayer = (l: Layer) => {
    update((p) => { p.decks[p.activeDevice]!.slides[selection.slide].layers.push(l); });
    select(selection.slide, l.id);
  };

  const addSlide = () => {
    const built = buildDeck(deck.template ?? "clean-light", deck.device, { orientation: deck.orientation, slides: [{}], locale: project.locales[0], icon: project.icon });
    update((p) => { p.decks[p.activeDevice]!.slides.splice(selection.slide + 1, 0, built.slides[0]); });
    select(selection.slide + 1, null);
  };

  const duplicateSlide = () => {
    update((p) => {
      const s = structuredClone(slide);
      s.id = uid("sl");
      s.layers.forEach((l) => (l.id = uid(l.type[0])));
      p.decks[p.activeDevice]!.slides.splice(selection.slide + 1, 0, s);
    });
    select(selection.slide + 1, null);
  };

  const moveSlide = (dir: -1 | 1) => {
    const to = selection.slide + dir;
    if (to < 0 || to >= deck.slides.length) return;
    update((p) => {
      const s = p.decks[p.activeDevice]!.slides;
      const [x] = s.splice(selection.slide, 1);
      s.splice(to, 0, x);
    });
    select(to, selection.layer);
  };

  const moveLayer = (id: string, dir: -1 | 1) => {
    update((p) => {
      const ls = p.decks[p.activeDevice]!.slides[selection.slide].layers;
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (j < 0 || j >= ls.length) return;
      [ls[i], ls[j]] = [ls[j], ls[i]];
    });
  };

  return (
    <aside className="left">
      <div className="section">
        <h3>Slide {selection.slide + 1} of {deck.slides.length}</h3>
        <div className="grid2">
          <button onClick={addSlide} disabled={deck.slides.length >= spec.slides.max}>+ Slide</button>
          <button onClick={duplicateSlide} disabled={deck.slides.length >= spec.slides.max}>Duplicate</button>
          <button onClick={() => moveSlide(-1)} disabled={selection.slide === 0}>← Move</button>
          <button onClick={() => moveSlide(1)} disabled={selection.slide >= deck.slides.length - 1}>Move →</button>
        </div>
        <button className="danger" disabled={deck.slides.length <= 1} onClick={() => update((p) => { p.decks[p.activeDevice]!.slides.splice(selection.slide, 1); })}>Delete slide</button>
        <div className="row small muted">
          {deck.slides.map((_, i) => (
            <button key={i} className={i === selection.slide ? "on" : ""} style={{ padding: "2px 7px" }} onClick={() => select(i, null)}>{i + 1}</button>
          ))}
        </div>
        <span className="small muted">Store limit: {spec.slides.max} {spec.slides.max === 1 ? "image" : "slides"}.</span>
      </div>

      <div className="section">
        <h3>Add layer</h3>
        <div className="grid2">
          <button disabled={spec.noText} title={spec.noText ? "This store slot does not allow added text" : ""} onClick={() => addLayer(newText("New **text**", locale, { x: W * 0.1, y: H * 0.1, w: W * 0.8, h: H * 0.12, size: Math.round(Math.min(W, H) * 0.07), text: { [project.locales[0]]: "New **text**", [locale]: "New **text**" } }))}>Text</button>
          <button onClick={() => addLayer(newDevice(deck.device, W, H, { y: H * 0.3 }))}>Device</button>
          <button onClick={async () => {
            const f = await pickFile("image/*");
            if (!f) return;
            const id = await addImageFile(f);
            const sz = assetSize(id) ?? { w: 500, h: 500 };
            const w = Math.min(W * 0.5, sz.w);
            addLayer(newImage(id, w, (w * sz.h) / sz.w, { x: (W - w) / 2, y: H * 0.4 }));
          }}>Image</button>
          <button onClick={() => addLayer(newShape("rect", { x: W * 0.3, y: H * 0.4, w: W * 0.4, h: W * 0.4 }))}>Rectangle</button>
          <button onClick={() => addLayer(newShape("ellipse", { x: W * 0.3, y: H * 0.4, w: W * 0.4, h: W * 0.4 }))}>Circle</button>
          <button onClick={() => addLayer(newShape("blob", { x: W * 0.25, y: H * 0.4, w: W * 0.5, h: W * 0.5, opacity: 0.6 }))}>Blob</button>
          <button onClick={() => addLayer(newShape("star", { x: W * 0.4, y: H * 0.4, w: W * 0.2, h: W * 0.2, fill: { type: "solid", color: "#ffb547" } }))}>Star</button>
          <button disabled={!project.icon} title={project.icon ? "" : "Set the app icon in the right panel first"} onClick={() => addLayer(newImage(project.icon!, W * 0.25, W * 0.25, { name: "App icon", x: W * 0.375, y: H * 0.1, radius: W * 0.056, fit: "cover" }))}>App icon</button>
        </div>
      </div>

      <div className="section">
        <h3>Layers (top first)</h3>
        <div className="layer-list">
          {[...(slide?.layers ?? [])].reverse().map((l) => (
            <div key={l.id} className={`layer-item${l.id === selection.layer ? " sel-item" : ""}`} onClick={() => select(selection.slide, l.id)}>
              <span className="ico">{ICON[l.type]}</span>
              <span className="name" style={{ opacity: l.hidden ? 0.4 : 1 }}>
                {l.type === "text" ? (l.text[locale] ?? Object.values(l.text)[0] ?? "").replace(/\*\*/g, "").split("\n")[0] || l.name : l.name ?? l.type}
              </span>
              <button title="Bring forward" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }}>↑</button>
              <button title="Send backward" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }}>↓</button>
              <button title={l.hidden ? "Show" : "Hide"} onClick={(e) => { e.stopPropagation(); update((p) => { const x = p.decks[p.activeDevice]!.slides[selection.slide].layers.find((q) => q.id === l.id)!; x.hidden = !x.hidden; }); }}>{l.hidden ? "◌" : "●"}</button>
              <button title={l.locked ? "Unlock" : "Lock"} onClick={(e) => { e.stopPropagation(); update((p) => { const x = p.decks[p.activeDevice]!.slides[selection.slide].layers.find((q) => q.id === l.id)!; x.locked = !x.locked; }); }}>{l.locked ? "🔒" : "🔓"}</button>
            </div>
          ))}
          {!slide?.layers.length && <span className="muted small">No layers on this slide.</span>}
        </div>
      </div>
    </aside>
  );
}

