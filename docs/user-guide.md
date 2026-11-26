# screenshot-guru user guide

screenshot-guru makes App Store and Google Play images in your browser. Nothing is uploaded.
Your work is saved in this browser automatically.

## 1. Three ways to start

1. **Use a template.** Click **Templates**, pick a look, and click **Use layout and style**.
2. **Drop your screenshots.** Drag images from your computer onto the phones on the canvas.
3. **Open a project from your AI.** If your AI made a `.zip` with the screenshot-guru skill, drop the
   zip anywhere on the page, or click **Open**.

## 2. Top bar

| Control | What it does |
|---|---|
| App name | Your app's name. Used by templates and file names. |
| Device menu | Choose what you are making: iPhone, iPad, Apple Watch, Mac, Apple TV, Vision Pro, Android phone and tablets, Chromebook, Wear OS, Android TV, TV banner, Android XR, Feature graphic, or a promo banner. A dot (●) marks devices that already have slides. |
| Language menu | Switch the language you are editing. **Languages…** adds or removes languages. The first language is the base. |
| ↶ ↷ | Undo and redo (also ⌘Z / ⇧⌘Z, or Ctrl+Z / Ctrl+Y). |
| Templates | Built-in looks and your saved templates. |
| Checks | Store rule warnings for all your decks. |
| Open | Open a project `.zip` or `.json`. |
| Save | Download the project with its images as a `.zip`. |
| New | Start an empty project. Save first if you need the old one. |
| Add AI skill | Install steps for Claude, Antigravity, GitHub Copilot and Cursor. |
| Export | Make the store-ready images. |

## 3. The canvas

- All slides of one device sit side by side. A phone or text can cross from one slide into the
  next; each exported image gets its own part.
- Click a layer to select it. Drag to move. Use the corner handles to resize and the round handle
  to rotate (hold Shift for 15° steps).
- Layers snap to the slide centre and edges. Hold Alt to move freely.
- Drop an image on a phone to set its screenshot. Drop it on empty space to add it.
- Arrow keys nudge the selected layer by 1 px (Shift: 10 px). Delete removes it. ⌘D / Ctrl+D duplicates.
- **Safe areas** (red stripes) show where a store crops or covers the image.

## 4. Left panel

- **Slide** buttons: add, duplicate, move or delete the current slide. The store limit is shown.
- **Add layer**: Text, Device, Image, Rectangle, Circle, Blob, Star, App icon.
- **Layers**: the list for the current slide, top layer first. ↑ ↓ change order, ● hides, 🔒 locks.

## 5. Right panel (inspector)

With nothing selected you see the deck and app settings:

- **Device info and rules**, **Orientation** (for devices that rotate), **Restyle with a template**
  (keeps your text and screenshots).
- **Background**: solid, linear or radial gradient; **Light, pattern and texture** adds light orbs,
  dots/grid/lines/waves, grain and vignette. Use one background for all slides, or a custom one per slide.
- **App**: name and icon.

With a layer selected:

- **Text**: the text for the current language. Put `**double stars**` around words to highlight them.
  Font (or upload your own font file), weight, size, line height, letter spacing, alignment,
  italic, UPPERCASE, shrink to fit, fill (solid or gradient), highlight colour and style
  (coloured words, marker, pill), outline.
- **Device**: screenshot (per language if you want), frame type and colour, glare, corner radius
  for frameless, **Fit height to screenshot**.
- **Image**: replace, fit, mask, corner radius, fade one edge.
- **Shape**: type, corner radius, fill, outline.
- **Position**: x, y, width, height, rotation.
- **Effects**: opacity, blend mode, blur, shadow or glow.

## 6. Languages

Add languages with **Languages…**. Edit each language by switching the language menu. If a text or
screenshot has no translation, the base language is used. Arabic, Hebrew, Persian and Urdu text
fields type right-to-left.

## 7. Templates

**Templates** shows 12 built-in looks with previews made from your own text and screenshots.

- **Apply style only** changes colours and fonts and keeps your layout.
- **Use layout and style** rebuilds the slides and keeps your text and screenshots.
- **My templates**: save the current deck under a name and reuse it later, on any device.

## 8. Checks and export

**Checks** lists problems such as too many slides, text where a store forbids it, low contrast,
text in a cropped area, or missing translations.

**Export** lets you choose devices, sizes, languages and PNG or JPEG. You get one `.zip`:

```
app-store/iphone/1320x2868/en/01.png
google-play/feature-graphic/1024x500/de/01.png
promo/in-app-event-card-horizontal/1920x1080/en/01.png
```

Upload each folder to the matching slot in App Store Connect or Play Console. All images are
opaque (no transparency), as both stores require.

## 9. Using your AI

Click **Add AI skill** and follow the steps for your AI tool. Then ask, for example:
"Make App Store and Google Play screenshots for my app with screenshot-guru." Give it your raw
screenshots. It writes the headlines and sends you a project `.zip` (or, if it can control a
browser, builds the deck on this page directly).

## 10. Privacy

The site has no accounts, no analytics and no server storage. Projects and images stay in your
browser's storage until you click **New** or clear site data. Use **Save** to keep a copy.
