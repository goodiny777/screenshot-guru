# project.json format

A project zip contains:

```
project.json
assets/
  icon.png
  en/home.png
  de/home.png
  ...
```

Image paths in `project.json` are relative to the zip root (for example `assets/en/home.png`).
On import the editor stores every image in the browser and replaces the paths with internal ids.
PNG, JPEG, WebP, GIF and AVIF are accepted. Fonts (TTF, OTF, WOFF, WOFF2) can be included too.

## Recipe format (write this)

You describe the copy and screenshots per slide; the chosen template does the layout.

```json
{
  "schema": "screenshot-guru/1",
  "name": "Habitly",
  "locales": ["en", "de"],
  "icon": "assets/icon.png",
  "decks": {
    "iphone": {
      "template": "midnight-glow",
      "orientation": "portrait",
      "style": { "accent": "#a78bfa" },
      "slides": [
        {
          "layout": "hero",
          "label": { "en": "DAILY HABITS", "de": "TÄGLICHE GEWOHNHEITEN" },
          "headline": { "en": "Build habits\nthat **stick**", "de": "Gewohnheiten,\ndie **bleiben**" },
          "screenshot": { "en": "assets/en/home.png", "de": "assets/de/home.png" }
        },
        {
          "layout": "duo",
          "headline": { "en": "Plan your **week**\nin a minute", "de": "Plane deine **Woche**\nin einer Minute" },
          "screenshot": "assets/en/plan.png",
          "screenshot2": "assets/en/home.png"
        }
      ]
    },
    "feature-graphic": {
      "template": "midnight-glow",
      "slides": [{ "headline": "Habits that **stick**", "screenshot": "assets/en/home.png" }]
    }
  }
}
```

### Top level

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | Always `"screenshot-guru/1"`. |
| `name` | yes | App name. |
| `locales` | yes | Language codes. The first is the base; missing translations fall back to it. |
| `icon` | no | App icon path. Used by `claim`/`icon` layouts and banners. |
| `decks` | yes | Object keyed by device id (see devices.md). One deck per device. |
| `fonts` | no | `{ "Family Name": "assets/fonts/MyFont.ttf" }` to use a licensed brand font. |

### Deck (recipe)

| Field | Meaning |
|---|---|
| `template` | Template id (see templates.md). |
| `orientation` | `"portrait"` (default) or `"landscape"`, only for rotatable devices. |
| `style` | Optional overrides: `accent`, `textColor`, `frameColor`, `font`, `background`. |
| `slides` | Array of recipe slides. Keep within the device's max slides. |

### Recipe slide

| Field | Meaning |
|---|---|
| `layout` | `hero` (text top, device below), `top` (device top, text below), `duo` (two tilted devices), `claim` (big text, optional icon), `span` (device crosses into the next slide), `side` (text left, device right; wide canvases), `icon` (icon + text; banners), `full` (screenshot full-bleed, no frame). Omit to use the template's sequence. |
| `label` | Small uppercase kicker above the headline. Optional. |
| `headline` | Main message. Use `\n` for a line break and `**word**` to highlight. |
| `subline` | Optional supporting line (`hero`, `claim`, `side`). |
| `screenshot` | Image path, or a locale map for localized screenshots. |
| `screenshot2` | Second screenshot for `duo`. |
| `background` | Optional background for this slide only (see below). |

Any text field may be a plain string (same in every language) or a locale map
`{ "en": "...", "de": "..." }`.

On wide canvases (Mac, TV, Chromebook, banners) `hero`, `top` and `span` become `side`.
On Wear OS every slide becomes `full` (store rule: no text, no frame).

### Background

```json
{
  "paint": { "type": "linear", "angle": 160, "stops": [{ "offset": 0, "color": "#1e1440" }, { "offset": 1, "color": "#07070d" }] },
  "orbs": [{ "x": 0.85, "y": 0.2, "r": 0.45, "color": "#7c3aed", "opacity": 0.45 }],
  "pattern": { "type": "dots", "color": "#000000", "opacity": 0.1, "size": 60 },
  "noise": 0.25,
  "vignette": 0.3
}
```

`paint.type` is `solid` (`color`), `linear` (`angle` in degrees, 0 = to top, 90 = to right) or
`radial` (`cx`, `cy` 0–1, `r` relative to the larger side). Pattern types: `none`, `dots`, `grid`,
`lines`, `waves`. `noise` (film grain) and `vignette` are 0–1.

## Full format (fine control)

A deck may instead contain full slides with layers, exactly as the editor saves them. Use this only
when the user asks for precise placement; otherwise the recipe format gives better results.

```json
{
  "device": "iphone",
  "orientation": "portrait",
  "spanBackground": false,
  "background": { "paint": { "type": "solid", "color": "#ffffff" } },
  "slides": [
    {
      "id": "s1",
      "layers": [
        { "id": "t1", "type": "text", "name": "Headline", "x": 92, "y": 170, "w": 1136, "h": 560,
          "text": { "en": "Track **every** habit" }, "font": "Inter", "weight": 800, "size": 120,
          "align": "center", "fill": { "type": "solid", "color": "#111827" }, "highlight": "#4f46e5" },
        { "id": "d1", "type": "device", "x": 145, "y": 820, "w": 1030, "h": 2200,
          "asset": "assets/en/home.png", "frame": "phone", "frameColor": "#111111",
          "shadow": { "color": "rgba(0,0,0,0.25)", "blur": 80, "x": 0, "y": 40 } }
      ]
    }
  ]
}
```

Coordinates are design-canvas pixels (devices.md). Layers may extend past a slide edge into the
next slide. Layer types: `text`, `device` (frames: `phone`, `phone-android`, `tablet`, `watch`,
`watch-round`, `laptop`, `tv`, `browser`, `none`), `image`, `shape` (`rect`, `ellipse`, `star`,
`blob`). Common optional fields: `rotation`, `opacity`, `blend`, `shadow`, `blur`, `hidden`, `locked`.
Text extras: `lineHeight`, `letterSpacing` (em), `vAlign`, `italic`, `uppercase`, `autoFit`,
`highlightStyle` (`color`, `marker`, `pill`), `stroke`. Device/image layers accept
`assets: { "de": "assets/de/home.png" }` for per-language images.

## Fonts available without uploading

Inter, Plus Jakarta Sans, Manrope, DM Sans, Poppins, Montserrat, Outfit, Sora, Space Grotesk, Nunito,
Rubik, Bricolage Grotesque, Unbounded, Syne, Bebas Neue, Anton, Fraunces, Playfair Display,
DM Serif Display, Instrument Serif, Caveat, Noto Sans, Noto Serif, Noto Sans Arabic, Noto Sans Hebrew,
Noto Sans JP, Noto Sans KR, Noto Sans SC, Noto Sans Georgian. For Cyrillic, Greek or Vietnamese use
Inter, Montserrat, Rubik, Noto Sans or Noto Serif.
