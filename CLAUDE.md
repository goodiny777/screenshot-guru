# screenshot-guru — project conventions

Browser-only editor for App Store / Google Play marketing images, plus an Agent Skill that plans the copy
and hands the result to the editor. Read this before writing specs or code.

## Product rules (non-negotiable)

- **No server-side rendering or storage.** Everything runs in the browser. Firebase is used for static
  Hosting only. Adding Cloud Functions, Firestore, Auth or Analytics requires a new spec.
- **Nothing leaves the user's browser** except requests for Google Fonts CSS/files. No telemetry.
- **No vendor artwork.** Device frames are generic vector drawings. Never bundle Apple/Google bezels,
  logos or trademarked imagery.
- **Store sizes come from official docs only** (App Store Connect Help, Play Console Help, Android
  developer docs). Every size added cites its source in the spec or PR.
- **Exports are opaque.** PNG 24-bit (no alpha channel) or JPEG. Never ship an alpha channel.

## Stack

- Vite + React 19 + TypeScript (strict). No UI framework; plain CSS in `src/index.css`.
- Canvas 2D renderer (`src/render/`) shared by preview and export — keep them on one code path.
- State: tiny store with undo/redo (`src/store/store.ts`); persistence in IndexedDB via `idb-keyval`.
- Zip: `fflate`. PNG encode: `fast-png`. Skill build: `esbuild` (`scripts/build-skill.mjs`).
- Tests: Vitest (unit) + Playwright (e2e). CI: `.github/workflows/ci.yml`; deploy: `deploy.yml`, `preview.yml`.
- Hosting: Firebase project `screenshot-guru-11436`, site https://screenshot-guru-11436.web.app

## Layout

```
src/model/     types, device catalog (devices.ts), fonts, templates + recipe expansion
src/render/    renderer, frames, text layout, paint/background, export + store checks
src/store/     state + undo, IndexedDB assets, project zip import/export
src/agent/     window.screenshotGuru API (browser-control handoff)
src/ui/        React editor
skills/screenshot-guru/   the Agent Skill (references/devices.md + templates.md are GENERATED)
scripts/       build-skill.mjs (generates skill refs, packs public/screenshot-guru-skill.zip)
docs/          architecture, user-guide (local gitignored: specs, bugs, future-work, prod-readiness)
```

## Commands

```bash
npm run dev          # editor at http://localhost:5173
npm run build        # skill refs + skill zip + typecheck + bundle (dist/)
npm run skill        # regenerate skill references and zip only
npm run deploy       # build + firebase deploy --only hosting (needs firebase login)
npm run check        # lint + typecheck + skip gate + skill freshness + unit tests
npm run test:e2e     # Playwright e2e (CHROME_PATH=/usr/bin/google-chrome on machines without Playwright Chromium)
```

Tests: unit in `tests/unit` (pure logic), e2e in `tests/e2e` (real canvas, IndexedDB, fonts).
A skipped test must contain `blocked by BUG-NNN` (CI gate). Production headers are tested via
`scripts/serve-dist.mjs` on port 4174.

## Specs

Specs follow the spec-development skill: `docs/specs/SPEC-NNN-{slug}/` (epic, tasks, plan,
verification-checklist). Hotfixes: `HF-NNN`. Bugs: `docs/bugs/BUG-NNN-*`.

## Documentation impact map

| Change | Update |
|---|---|
| New device / size / rule | `src/model/devices.ts` → run `npm run skill` → `docs/architecture/README.md` §Devices |
| New template | `src/model/templates.ts` → `npm run skill` |
| Project JSON format change | `skills/screenshot-guru/references/project-format.md` + schema + `docs/architecture/README.md` §Data |
| `window.screenshotGuru` change | `skills/screenshot-guru/references/browser-api.md` |
| Hosting / headers / deploy | `firebase.json`, `.github/workflows/*` |

## Writing style

User-facing copy and docs are plain English for non-native readers: short sentences, no idioms.
