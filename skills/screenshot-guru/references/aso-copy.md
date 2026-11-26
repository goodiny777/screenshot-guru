# Copy and slide order for store screenshots

## Slide order

1. **Hero** — the core promise in the user's words. The single biggest reason to install.
2. **Main benefit** — the action people do most, shown on its real screen.
3. **Differentiator** — what competitors do not do.
4. **Proof or depth** — progress, results, personalisation, integrations.
5. **Secondary benefits** — one per slide.
6. **Closer** — a calm reason to start ("Free to start", "Works offline", "No account needed").
   Google Play: no price, ranking or "Download now".

The first 2–3 slides appear in search results. They must make sense on their own, without the rest.

## Headline formulas

- Outcome: "**Sleep** better tonight", "Save **3 hours** a week"
- Verb + object + benefit: "Track every **habit** in one tap"
- Pain killer: "No more **lost** receipts"
- Before → after: "From chaos to **calm**"
- Social / emotional (no fake stats): "Made for **busy** parents"
- Specific number from the real product: "**12** guided programs"

Rules:
- 3–7 words; 2 lines max on portrait. Put a manual `\n` where the line should break.
- Lead with the benefit, not the feature name. "See where your money goes", not "Analytics dashboard".
- Highlight one word or short phrase per headline with `**…**`, ideally a search keyword.
- Use the label (kicker) for the feature name or category in 1–3 words: "BUDGETS", "SLEEP SOUNDS".
- Same tense and voice on every slide. Sentence case, no full stop.
- Do not repeat the app name on every slide.

## Localisation

- Translate meaning, not words; keep the same length or shorter (German and Russian run 20–35% longer,
  so cut words rather than shrink text).
- Keep the highlighted word meaningful in each language.
- Use local screenshots when the user has them (`screenshot: { "en": …, "de": … }`).
- Arabic, Hebrew, Persian, Urdu: write native RTL copy; do not mirror the UI screenshots yourself.

## Store-specific notes

- App Store: up to 10 per device; 6.9"/6.5" iPhone and 13" iPad sets scale down to smaller devices.
- Google Play: 2–8 per device type; JPEG or 24-bit PNG, no alpha; each side 320–3840 px with the long
  side at most twice the short side. No rankings, awards, testimonials, prices or promotions in the image.
- Feature Graphic (1024×500): app name or promise, big and centred; no small text; it is also the
  video cover.
- Wear OS: only the real watch UI, full screen, 1:1, no frame and no added text.
- In-App Event card (16:9) and details (9:16): imagery first; Apple adds title and gradient, crops
  ~75 px on the card's sides and blurs the bottom of the details image.
