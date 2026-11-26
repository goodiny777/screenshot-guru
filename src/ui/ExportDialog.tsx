import { useMemo, useState } from "react";
import { getDevice, sizesFor } from "../model/devices";
import { download, exportBundle, validate, type Format, type Oversize } from "../render/export";
import { useStore } from "../store/store";
import { Check, Dialog } from "./controls";

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project);
  const deckIds = Object.keys(project.decks);
  const [devices, setDevices] = useState<string[]>(deckIds);
  const [locales, setLocales] = useState<string[]>(project.locales);
  const [format, setFormat] = useState<Format>("png");
  const [sizes, setSizes] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(deckIds.map((id) => [id, sizesFor(id, project.decks[id].orientation).map((s) => s.label)])),
  );
  const [progress, setProgress] = useState<{ done: number; total: number; file: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [oversize, setOversize] = useState<Oversize[]>([]);
  const warnings = useMemo(() => validate(project).filter((w) => devices.includes(w.device)), [project, devices]);
  const errors = warnings.filter((w) => w.level === "error").length;

  const total = devices.reduce((n, id) => n + (sizes[id]?.length ?? 0) * project.decks[id].slides.length * locales.length, 0);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const run = async () => {
    setResult(null);
    setOversize([]);
    setProgress({ done: 0, total, file: "" });
    try {
      const r = await exportBundle(project, { devices, locales, format, sizes }, (done, t, file) => setProgress({ done, total: t, file }));
      download(r.zip, `${project.name.replace(/\W+/g, "-") || "app"}-store-assets.zip`);
      setOversize(r.oversize);
      setResult(`Done: ${r.files} images.${r.missing.length ? ` ${r.missing.length} image(s) could not be loaded.` : ""}`);
    } catch (e) {
      setResult(`Export failed: ${(e as Error).message}`);
    } finally {
      setProgress(null);
    }
  };

  return (
    <Dialog
      title="Export store assets"
      onClose={onClose}
      footer={
        <>
          <span className="muted small grow">{total} images · {format === "png" ? "24-bit PNG, no alpha" : "JPEG 92%"} · rendered in your browser</span>
          <button onClick={onClose}>Close</button>
          <button className="primary" disabled={!total || !!progress} onClick={run}>{progress ? "Exporting…" : "Export ZIP"}</button>
        </>
      }
    >
      {progress && (
        <div className="field">
          <div className="progress"><div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
          <span className="small muted">{progress.done} / {progress.total} · {progress.file}</span>
        </div>
      )}
      {result && <div className="warn-item tip">{result}</div>}
      {oversize.length > 0 && (
        <div className="warn-item" role="alert">
          <b>{oversize.length} file(s) are larger than the store allows.</b> Export these devices again as JPEG (smaller), or reduce grain and patterns:
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {oversize.slice(0, 6).map((o) => <li key={o.path}>{o.path} — {(o.bytes / 1048576).toFixed(1)} MB (max {(o.max / 1048576).toFixed(0)} MB)</li>)}
          </ul>
          {format === "png" && <button style={{ marginTop: 8 }} onClick={() => setFormat("jpeg")}>Switch to JPEG</button>}
        </div>
      )}
      <div className="field">
        <h3>Devices and sizes</h3>
        {deckIds.map((id) => {
          const d = getDevice(id);
          const all = sizesFor(id, project.decks[id].orientation);
          return (
            <div key={id} className="field" style={{ background: "var(--panel-2)", padding: 10, borderRadius: 8 }}>
              <Check label={`${d.label} · ${project.decks[id].slides.length} slide(s)`} value={devices.includes(id)} onChange={() => setDevices(toggle(devices, id))} />
              {devices.includes(id) && (
                <div className="row" style={{ flexWrap: "wrap", gap: 10, paddingLeft: 22 }}>
                  {all.map((s) => (
                    <label key={s.label} className="row small" style={{ color: "var(--text)" }}>
                      <input type="checkbox" checked={sizes[id]?.includes(s.label) ?? false} onChange={() => setSizes({ ...sizes, [id]: toggle(sizes[id] ?? [], s.label) })} />
                      {s.w}×{s.h} <span className="muted">{s.label}{s.required ? " · required" : ""}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid2">
        <div className="field">
          <h3>Languages</h3>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            {project.locales.map((l) => <Check key={l} label={l} value={locales.includes(l)} onChange={() => setLocales(toggle(locales, l))} />)}
          </div>
        </div>
        <div className="field">
          <h3>Format</h3>
          <div className="row" style={{ gap: 14 }}>
            <Check label="PNG (best for App Store)" value={format === "png"} onChange={() => setFormat("png")} />
            <Check label="JPEG (smaller)" value={format === "jpeg"} onChange={() => setFormat("jpeg")} />
          </div>
        </div>
      </div>
      <div className="field">
        <h3>Store checks {errors > 0 && <span className="badge">{errors}</span>}</h3>
        {warnings.length ? (
          <div className="warn-list">
            {warnings.map((w, i) => <div key={i} className={`warn-item ${w.level}`}>{w.message}</div>)}
          </div>
        ) : (
          <div className="warn-item tip">No problems found.</div>
        )}
      </div>
    </Dialog>
  );
}
