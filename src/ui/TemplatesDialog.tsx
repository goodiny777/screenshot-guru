import { useEffect, useRef, useState } from "react";
import { canvasFor } from "../model/devices";
import { ensureFonts } from "../model/fonts";
import { STYLES, buildDeck, extractRecipe, restyleDeck } from "../model/templates";
import type { Deck } from "../model/types";
import { renderDeck } from "../render/renderer";
import { onAssetsChanged } from "../store/assets";
import { adaptDeck, deleteUserTemplate, listUserTemplates, saveUserTemplate, update, useStore, type UserTemplate } from "../store/store";
import { Dialog } from "./controls";

function Thumb({ deck, slides = 3 }: { deck: Deck; slides?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => onAssetsChanged(() => setTick((t) => t + 1)), []);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { w, h } = canvasFor(deck.device, deck.orientation);
    const n = Math.min(slides, deck.slides.length);
    const targetW = 480;
    const scale = targetW / (w * n);
    c.width = targetW;
    c.height = Math.round(h * scale);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderDeck(ctx, { ...deck, slides: deck.slides.slice(0, n) }, { locale: "en", fallbackLocale: "en", slideW: w, slideH: h, to: n - 1 });
  }, [deck, slides, tick]);
  return <canvas ref={ref} />;
}

export function TemplatesDialog({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project);
  const deck = project.decks[project.activeDevice]!;
  const [tab, setTab] = useState<"builtin" | "mine">("builtin");
  const [picked, setPicked] = useState<string>(deck.template ?? "clean-light");
  const [mine, setMine] = useState<UserTemplate[]>([]);
  const [name, setName] = useState("");
  const [, setFontsReady] = useState(0);
  const recipe = extractRecipe(deck, project.locales[0]);
  const previews = STYLES.map((s) => buildDeck(s.id, deck.device, { orientation: deck.orientation, slides: recipe.slice(0, 3), locale: project.locales[0], appName: project.name, icon: project.icon }));

  useEffect(() => {
    void listUserTemplates().then(setMine);
    void ensureFonts(STYLES.flatMap((s) => [{ font: s.font, weight: s.weight, italic: s.italic }, { font: s.labelFont ?? s.font, weight: 700 }])).then(() => setFontsReady((x) => x + 1));
  }, []);

  const apply = (mode: "rebuild" | "restyle") => {
    update((p) => {
      const d = p.decks[p.activeDevice]!;
      p.decks[p.activeDevice] =
        mode === "restyle"
          ? restyleDeck(d, picked)
          : buildDeck(picked, d.device, { orientation: d.orientation, slides: extractRecipe(d, p.locales[0]), locale: p.locales[0], appName: p.name, icon: p.icon });
    });
    onClose();
  };

  return (
    <Dialog
      title="Templates"
      wide
      onClose={onClose}
      footer={
        tab === "builtin" ? (
          <>
            <span className="muted small grow">Your headlines and screenshots are kept either way.</span>
            <button onClick={() => apply("restyle")}>Apply style only</button>
            <button className="primary" onClick={() => apply("rebuild")}>Use layout and style</button>
          </>
        ) : (
          <>
            <input type="text" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 260 }} />
            <button className="primary" disabled={!name.trim()} onClick={async () => { setMine(await saveUserTemplate(name.trim(), deck)); setName(""); }}>Save current deck</button>
          </>
        )
      }
    >
      <div className="tabs">
        <button className={tab === "builtin" ? "on" : ""} onClick={() => setTab("builtin")}>Built-in (12)</button>
        <button className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>My templates ({mine.length})</button>
      </div>
      {tab === "builtin" ? (
        <div className="cards">
          {STYLES.map((s, i) => (
            <div key={s.id} className={`card${picked === s.id ? " picked" : ""}`} onClick={() => setPicked(s.id)} onDoubleClick={() => apply("rebuild")}>
              <Thumb deck={previews[i]} />
              <div className="meta">
                <b>{s.name}</b>
                <span className="small muted">{s.description}</span>
              </div>
            </div>
          ))}
        </div>
      ) : mine.length ? (
        <div className="cards">
          {mine.map((t) => (
            <div key={t.id} className="card">
              <Thumb deck={t.deck} />
              <div className="meta row">
                <div className="grow">
                  <b>{t.name}</b>
                  <span className="small muted">from {t.device}</span>
                </div>
                <button onClick={() => { update((p) => { p.decks[p.activeDevice] = adaptDeck(t.deck, deck.device, deck.orientation); }); onClose(); }}>Apply</button>
                <button className="ghost danger" onClick={async () => setMine(await deleteUserTemplate(t.id))}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No saved templates yet. Design a deck, then save it here to reuse it in other projects or on other devices.</div>
      )}
    </Dialog>
  );
}
