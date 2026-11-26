# Templates

Generated from the app. Use the **id** as `template` in a recipe deck. Each template has a default
layout sequence that is used when a slide does not set `layout`.

| id | Name | Look | Default layouts | Font |
|---|---|---|---|---|
| `clean-light` | Clean Light | Bright, calm and neutral. Works for any category. | hero, hero, top, duo, hero, claim | Inter |
| `midnight-glow` | Midnight Glow | Dark premium look with soft purple light. | hero, top, hero, duo, hero, claim | Plus Jakarta Sans |
| `vivid-gradient` | Vivid Gradient | Loud warm gradient, white type, dark pill highlights. | hero, hero, top, hero, duo, claim | Poppins |
| `pastel-dream` | Pastel Dream | Soft pink and blue, rounded type, white devices. | hero, duo, hero, top, hero, claim | Nunito |
| `swiss-bold` | Swiss Bold | Off-white paper, huge left-aligned type, red accent. | hero, top, hero, claim, hero, duo | Inter |
| `aurora-glass` | Aurora Glass | Deep blue with aurora light and film grain. | hero, span, hero, top, hero, claim | Sora |
| `neon-night` | Neon Night | Black, lime accent, sporty uppercase type. | hero, duo, hero, top, claim, hero | Space Grotesk |
| `paper-japandi` | Paper Japandi | Warm paper, quiet serif, lots of air. | hero, hero, top, hero, claim, duo | Fraunces |
| `candy-pop` | Candy Pop | Yellow, dots, pink pills. Fun and social. | hero, duo, hero, top, hero, claim | Poppins |
| `ocean-tilt` | Ocean Tilt | Electric blue gradient with tilted device pairs. | duo, hero, duo, top, duo, claim | Manrope |
| `panorama` | Panorama | One gradient across all slides, devices crossing edges. | hero, span, hero, span, hero, claim | Outfit |
| `editorial-serif` | Editorial Serif | Dark magazine style with italic serif headlines. | hero, top, hero, claim, duo, hero | Instrument Serif |

## Picking a template

- Match the app category: finance/productivity → clean-light, swiss-bold, midnight-glow; wellness/lifestyle → paper-japandi, pastel-dream; social/fun → candy-pop, vivid-gradient; fitness/sport → neon-night; creative/photo → editorial-serif, aurora-glass; anything with a strong brand gradient → panorama or ocean-tilt.
- `panorama` and `aurora-glass` draw one background across all slides; use `span` layouts so a device crosses into the next slide.
- Override colours with `style`: `{ "accent": "#ff3b6b", "textColor": "#111", "frameColor": "#f5f5f7", "font": "Poppins", "background": { ... } }`.
