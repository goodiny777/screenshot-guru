---
name: screenshot-guru
description: Plan and build App Store and Google Play screenshots, banners, watch, TV and tablet assets with the screenshot-guru web editor. Use for app store screenshots, ASO visuals or feature graphics.
---

# screenshot-guru

screenshot-guru is a free, browser-only editor for store marketing images: https://screenshot-guru-11436.web.app
Nothing is uploaded to a server; rendering and export happen in the user's browser.

Your job: turn the user's app and raw screenshots into a finished **project** for the editor, following
App Store and Google Play rules and ASO practice. The user then fine-tunes and exports in the browser.

## Two ways to hand the project over

1. **Project file (always works).** Write `project.json`, pack it with the images into a `.zip`
   (`scripts/pack_project.py`), and tell the user to open the site and drop the zip onto the page
   (or use **Open**).
2. **Browser control (when you can drive a browser).** Open the site, then call `window.screenshotGuru`
   in the page: load the project, look at rendered slides, fix problems, export. See
   `references/browser-api.md`. Prefer this when you have browser tools; it lets you check your work.

## Workflow

1. **Gather** (ask only for what is missing; one round of questions at most):
   - App name, one-sentence promise, top 3–5 benefits in priority order, audience.
   - Stores and devices: iPhone, iPad, Mac, Apple Watch, Apple TV, Vision Pro, Android phone/tablets,
     Chromebook, Wear OS, Android TV, Android XR, Feature Graphic, promo banners.
   - Languages. Localized screenshots per language, if they have them.
   - Raw screenshots (paths) and app icon. Brand colours or a mood; otherwise pick a template.
2. **Plan the story** with `references/aso-copy.md`: one benefit per slide, strongest first,
   3–7 word headlines, a highlighted keyword per headline (`**word**`).
3. **Choose** a template per deck (`references/templates.md`) and device ids (`references/devices.md`).
   Respect slide limits and device rules (Wear OS: no text, no frames).
4. **Write `project.json`** in the recipe format (`references/project-format.md`). Start from
   `assets/example-project.json`. Translate copy for every locale yourself; keep translations short.
5. **Hand over**:
   - File route: `python3 scripts/pack_project.py project.json --out <AppName>.screenshot-guru.zip`
     (copies every referenced image into the zip and checks the JSON). Give the user the zip and
     these steps: open https://screenshot-guru-11436.web.app, drop the zip on the page, review, click **Export**.
   - Browser route: open the site and follow `references/browser-api.md`.
6. **Check**: run `screenshotGuru.validate()` (browser route) or tell the user to open **Checks**. Fix
   errors; mention remaining tips.

## Rules that matter

- Screenshots are ads, not documentation: sell an outcome per slide, not a feature list.
- The first 2–3 slides decide most installs; they show in search results.
- No transparency: export is opaque PNG or JPEG. Never ask the user to add alpha.
- Google Play: no rankings, "#1", "best", prices, awards or calls like "Download now" in images.
- App Store In-App Event images: avoid added text and logos; Apple overlays the event name.
- Use real app UI. Do not invent features that are not in the screenshots.
- Keep text readable on a phone: headline 3–7 words, at most 2 lines on portrait slides.
- Wrap the one key word or phrase in `**double stars**` so the template highlights it.
- RTL languages (ar, he, fa, ur): write natural RTL copy; the editor handles direction per layer.

## Files in this skill

- `references/project-format.md` — project.json: recipe format, full format, assets, locales.
- `references/devices.md` — every device id with sizes, slide limits and store rules.
- `references/templates.md` — the 12 built-in templates and when to use them.
- `references/aso-copy.md` — headline formulas and slide order that convert.
- `references/browser-api.md` — `window.screenshotGuru` methods for browser-capable agents.
- `scripts/pack_project.py` — validates project.json and builds the zip (Python 3, standard library only).
- `assets/example-project.json` — a complete example to copy from.

If Python is not available, build the zip with any zip tool: `project.json` at the root and every
image under `assets/`, with paths in the JSON matching the paths in the zip.
