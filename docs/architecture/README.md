# Architecture

**As of:** 2026-11-26 (initial prototype).

## Components

| Module | Responsibility |
|---|---|
| `src/model/types.ts` | Project, deck, slide, layer, recipe types (in-app contract) |
| `src/model/devices.ts` | Device catalogue: design canvas, export sizes, slide limits, rules, safe areas |
| `src/model/fonts.ts` | Curated Google Fonts list and on-demand loading |
| `src/model/defaults.ts` | Layer and deck factories, default frames per device |
| `src/model/templates.ts` | 12 styles, recipe expansion (`buildDeck`, `expandDeck`), `restyleDeck`, `extractRecipe` |
| `src/render/renderer.ts` | Draws a deck strip on Canvas 2D (shared by preview and export) |
| `src/render/frames.ts` | Generic vector device frames and screen geometry |
| `src/render/text.ts` | Word wrap, highlight runs, auto-fit, outline |
| `src/render/paint.ts` | Paints, backgrounds (orbs, patterns, grain, vignette), colour/contrast helpers |
| `src/render/export.ts` | Exact-size render, opaque PNG/JPEG encode, zip bundle, store checks (`validate`) |
| `src/store/store.ts` | App state, undo/redo, IndexedDB autosave, user templates, `adaptDeck` |
| `src/store/assets.ts` | Image/font Blobs in IndexedDB, decode cache |
| `src/store/io.ts` | Project zip import (recipe or full) and export |
| `src/agent/api.ts` | `window.screenshotGuru` for browser-controlling agents |
| `src/ui/*` | React editor: App, Stage, LeftPanel, Inspector, dialogs, controls |
| `scripts/build-skill.mjs` | Generates skill references from source and packs the skill zip |
| `skills/screenshot-guru/` | Agent Skill: SKILL.md, references, pack script, example |

## Data flow

1. Edits go through `update()` in the store (clone → mutate → push undo) and autosave to IndexedDB after 400 ms.
2. The Stage redraws the whole strip with `renderDeck` on every change.
3. Export renders each slide into its own canvas at the exact store size, strips alpha, encodes, zips.

## Handoff modes

- **A — Project file:** skill writes `project.json` (recipe) → `pack_project.py` → zip → user drops on page → `importProjectFile` → `expandDeck`.
- **C — Browser control:** agent opens the site and calls `window.screenshotGuru` (see `skills/screenshot-guru/references/browser-api.md`).

## Hosting

Static Firebase Hosting (`screenshot-guru-11436`). No server code. Only outbound requests: Google Fonts.
