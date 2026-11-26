# screenshot-guru

A free, browser-only editor for App Store and Google Play marketing images, plus an AI agent skill
that plans the copy and hands the result to the editor.

**Live:** https://screenshot-guru-11436.web.app (after the first deploy)

**Docs:** [`docs/architecture/`](docs/architecture/README.md)

- Every store size: iPhone (6.9"/6.5"/6.1"), iPad 13", iPhone Duo, Apple Watch (all sizes), Mac,
  Apple TV, Vision Pro, Android phone, 7" and 10" tablets, Chromebook, Wear OS, Android TV and TV banner,
  Android XR, Feature Graphic, In-App Event card and details, Play promotional content, vertical promo,
  App Store search creative.
- Connected canvas: devices and text can cross from one slide into the next.
- Free layers: text, images, device frames, shapes. Gradients, light orbs, patterns, grain, vignette,
  shadows and glows, blur, blend modes, rotation.
- 12 built-in templates plus your own saved templates.
- Languages with per-language text and screenshots, RTL-aware text editing.
- Store checks: slide limits, Wear OS rules, safe areas, contrast, missing translations.
- Export: exact sizes, opaque 24-bit PNG or JPEG, zipped by store / device / size / language.
- Nothing leaves the browser. Projects live in IndexedDB; save and open them as `.zip` files.

## AI skill

`skills/screenshot-guru/` is an [Agent Skill](https://agentskills.io) for Claude, Antigravity, GitHub Copilot
and Cursor. The site's **Add AI skill** button shows install steps for each. Quick installs:

```bash
npx skills add goodiny777/screenshot-guru -g          # Claude Code, Cursor, others
gh skill install goodiny777/screenshot-guru screenshot-guru  # GitHub Copilot
```

The skill hands work to the editor in two ways:

1. **Project file:** the agent writes `project.json` (short "recipe" format), packs it with the
   screenshots using `scripts/pack_project.py`, and you drop the zip onto the site.
2. **Browser control:** agents that can drive a browser call `window.screenshotGuru` on the page
   (load, edit, validate, render, export).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # regenerates skill references + public/screenshot-guru-skill.zip, then builds
```

`scripts/build-skill.mjs` generates `skills/screenshot-guru/references/devices.md` and `templates.md`
from the app source, so the skill always matches the editor.

## Deploy (Firebase Hosting)

```bash
npm i -g firebase-tools
firebase login
firebase use <your-project-id>   # edit .firebaserc if the id is not "screenshot-guru"
npm run deploy
```

Static hosting only; there is no server code.

## Project layout

```
src/model/      types, device catalog, fonts, templates (recipe expansion)
src/render/     canvas renderer, device frames, text layout, export + store checks
src/store/      state with undo/redo, IndexedDB assets, project zip import/export
src/agent/      window.screenshotGuru API
src/ui/         React editor
skills/         the agent skill (packed into public/ at build time)
```

Device frames are generic vector drawings; no vendor artwork is bundled.

## License

MIT. Made by [Mikhail Babozhko](https://mbwork.info).
