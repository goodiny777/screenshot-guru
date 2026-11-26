import { useEffect, useState } from "react";
import { DEVICES, getDevice } from "../model/devices";
import { uid } from "../model/defaults";
import { validate, download } from "../render/export";
import { exportProjectZip, importProjectFile } from "../store/io";
import { canRedo, canUndo, doRedo, doUndo, ensureDeck, getState, replaceProject, select, update, updateLayer, useStore } from "../store/store";
import { ExportDialog } from "./ExportDialog";
import { Inspector } from "./Inspector";
import { LeftPanel } from "./LeftPanel";
import { pickFile } from "./files";
import { SkillDialog } from "./SkillDialog";
import { Stage } from "./Stage";
import { TemplatesDialog } from "./TemplatesDialog";
import { Dialog } from "./controls";

const LOCALES = ["en", "de", "fr", "es", "it", "pt-BR", "ru", "uk", "he", "ar", "tr", "pl", "nl", "ja", "ko", "zh-Hans", "ka", "hi", "id", "sv"];

export function App() {
  const ready = useStore((s) => s.ready);
  const project = useStore((s) => s.project);
  const [dialog, setDialog] = useState<null | "templates" | "export" | "skill" | "checks" | "locales">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragFile, setDragFile] = useState(false);
  useStore((s) => s.selection); // re-render undo buttons

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 6000);
  };

  const importFile = async (file: File) => {
    try {
      const r = await importProjectFile(await file.arrayBuffer(), file.name);
      replaceProject(r.project);
      say(`Opened "${r.project.name}": ${Object.keys(r.project.decks).length} deck(s), ${r.assets} image(s).${r.warnings.length ? " " + r.warnings.join(" ") : ""}`);
    } catch (e) {
      say(`Could not open ${file.name}: ${(e as Error).message}`);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const mod = e.metaKey || e.ctrlKey;
      const { selection, project: p } = getState();
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); return; }
      if (!selection.layer) return;
      const deck = p.decks[p.activeDevice];
      const l = deck?.slides[selection.slide]?.layers.find((x) => x.id === selection.layer);
      if (!l) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        update((d) => { const s = d.decks[d.activeDevice]!.slides[selection.slide]; s.layers = s.layers.filter((x) => x.id !== l.id); });
        select(selection.slide, null);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const copy = { ...structuredClone(l), id: uid(l.type[0]), x: l.x + 40, y: l.y + 40 };
        update((d) => { d.decks[d.activeDevice]!.slides[selection.slide].layers.push(copy); });
        select(selection.slide, copy.id);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateLayer(selection.slide, l.id, { x: l.x + dx, y: l.y + dy }, `nudge:${l.id}`);
      } else if (e.key === "Escape") select(selection.slide, null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drop a project .zip / .json anywhere on the page
  useEffect(() => {
    const over = (e: DragEvent) => {
      const f = [...(e.dataTransfer?.items ?? [])].some((i) => i.kind === "file" && /zip|json/.test(i.type));
      if (f) { e.preventDefault(); setDragFile(true); }
    };
    const drop = (e: DragEvent) => {
      const f = [...(e.dataTransfer?.files ?? [])].find((x) => /\.(zip|json)$/i.test(x.name));
      setDragFile(false);
      if (!f) return;
      e.preventDefault();
      e.stopPropagation();
      void importFile(f);
    };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) setDragFile(false); };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop, true);
    window.addEventListener("dragleave", leave);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop, true);
      window.removeEventListener("dragleave", leave);
    };
  }, []);

  if (!ready) return <div className="empty">Loading…</div>;
  const warnings = validate(project);
  const errorCount = warnings.filter((w) => w.level !== "tip").length;
  const groups = [...new Set(DEVICES.map((d) => d.group))];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><div className="brand-mark" />Screenshot Guru</div>
        <input type="text" value={project.name} style={{ width: 140 }} title="App name" onChange={(e) => update((p) => { p.name = e.target.value; }, "name")} />
        <span className="sep" />
        <select
          value={project.activeDevice}
          style={{ width: 210 }}
          title="Device / asset type"
          onChange={(e) => {
            const id = e.target.value;
            ensureDeck(id);
            update((p) => { p.activeDevice = id; }, "ui");
            select(0, null);
          }}
        >
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {DEVICES.filter((d) => d.group === g).map((d) => (
                <option key={d.id} value={d.id}>{project.decks[d.id] ? "● " : "  "}{d.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={project.activeLocale} style={{ width: 86 }} title="Language" onChange={(e) => e.target.value === "+" ? setDialog("locales") : update((p) => { p.activeLocale = e.target.value; }, "ui")}>
          {project.locales.map((l) => <option key={l} value={l}>{l}</option>)}
          <option value="+">Languages…</option>
        </select>
        <span className="sep" />
        <button className="ghost" disabled={!canUndo()} onClick={doUndo} title="Undo (⌘Z)">↶</button>
        <button className="ghost" disabled={!canRedo()} onClick={doRedo} title="Redo (⇧⌘Z)">↷</button>
        <span className="sep" />
        <button onClick={() => setDialog("templates")}>Templates</button>
        <button onClick={() => setDialog("checks")}>Checks{errorCount > 0 && <span className="badge">{errorCount}</span>}</button>
        <div className="grow" />
        <button onClick={async () => { const f = await pickFile(".zip,.json"); if (f) void importFile(f); }} title="Open a project .zip (for example one made by your AI)">Open</button>
        <button onClick={async () => download(await exportProjectZip(project), `${project.name.replace(/\W+/g, "-") || "app"}.screenshot-guru.zip`)} title="Save the project with its images as a .zip">Save</button>
        <button onClick={() => { if (confirm("Start a new project? Save the current one first if you need it.")) { const p = structuredClone(getState().project); p.decks = {}; p.name = "My App"; p.icon = undefined; replaceProject(p); ensureDeck(p.activeDevice = "iphone"); } }}>New</button>
        <button onClick={() => setDialog("skill")}>Add AI skill</button>
        <button className="primary" onClick={() => setDialog("export")}>Export</button>
      </header>
      <LeftPanel />
      <Stage />
      <Inspector />
      {dialog === "templates" && <TemplatesDialog onClose={() => setDialog(null)} />}
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === "skill" && <SkillDialog onClose={() => setDialog(null)} />}
      {dialog === "checks" && (
        <Dialog title="Store checks" onClose={() => setDialog(null)}>
          {warnings.length ? (
            <div className="warn-list">{warnings.map((w, i) => <div key={i} className={`warn-item ${w.level}`}>{w.message}</div>)}</div>
          ) : <div className="warn-item tip">No problems found in any deck.</div>}
          <div className="field">
            <h3>{getDevice(project.activeDevice).label} rules</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>{getDevice(project.activeDevice).rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        </Dialog>
      )}
      {dialog === "locales" && <LocalesDialog onClose={() => setDialog(null)} />}
      {dragFile && <div className="backdrop" style={{ pointerEvents: "none" }}><div className="dialog" style={{ width: 420, padding: 30, textAlign: "center" }}><h2 style={{ margin: 0 }}>Drop to open project</h2><p className="muted">A .zip made by your AI or saved from here.</p></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function LocalesDialog({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project);
  const [custom, setCustom] = useState("");
  const add = (l: string) => update((p) => { if (!p.locales.includes(l)) p.locales.push(l); p.activeLocale = l; });
  return (
    <Dialog title="Languages" onClose={onClose} footer={<button className="primary" onClick={onClose}>Done</button>}>
      <span className="muted small">The first language is the base. Text and screenshots fall back to it when a translation is missing. Export makes one folder per language.</span>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {project.locales.map((l, i) => (
          <span key={l} className="chip">
            {l}{i === 0 && " (base)"}
            {i > 0 && <button className="ghost" style={{ padding: "0 4px" }} onClick={() => update((p) => { p.locales = p.locales.filter((x) => x !== l); if (p.activeLocale === l) p.activeLocale = p.locales[0]; })}>✕</button>}
            {i > 0 && <button className="ghost" style={{ padding: "0 4px" }} title="Make base" onClick={() => update((p) => { p.locales = [l, ...p.locales.filter((x) => x !== l)]; })}>★</button>}
          </span>
        ))}
      </div>
      <h3>Add</h3>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {LOCALES.filter((l) => !project.locales.includes(l)).map((l) => <button key={l} onClick={() => add(l)}>{l}</button>)}
      </div>
      <div className="row">
        <input type="text" placeholder="Other code, e.g. pt-PT" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button disabled={!custom.trim()} onClick={() => { add(custom.trim()); setCustom(""); }}>Add</button>
      </div>
    </Dialog>
  );
}
