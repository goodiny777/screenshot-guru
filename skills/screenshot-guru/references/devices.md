# Devices and store sizes

Generated from the app. Use the **id** as the key under `decks` in project.json.
The design canvas is what layer coordinates refer to. Export renders every listed size.

## App Store

| id | Label | Design canvas | Export sizes | Max slides | Rotatable |
|---|---|---|---|---|---|
| `iphone` | iPhone | 1320×2868 | 1320×2868, 1290×2796, 1260×2736, 1284×2778, 1242×2688, 1206×2622 (required), 1179×2556 | 10 | yes |
| `ipad` | iPad | 2064×2752 | 2064×2752 (required), 2048×2732 | 10 | yes |
| `iphone-duo-outer` | iPhone Duo outer | 1398×2034 | 1398×2034 | 10 | yes |
| `iphone-duo-inner` | iPhone Duo inner | 2007×2853 | 2007×2853 | 10 | yes |
| `apple-watch` | Apple Watch | 422×514 | 422×514, 410×502, 416×496, 396×484, 368×448, 312×390 | 10 | no |
| `mac` | Mac | 2880×1800 | 2880×1800, 2560×1600, 1440×900, 1280×800 | 10 | no |
| `apple-tv` | Apple TV | 3840×2160 | 3840×2160, 1920×1080 | 10 | no |
| `vision-pro` | Apple Vision Pro | 3840×2160 | 3840×2160 | 10 | no |

## Google Play

| id | Label | Design canvas | Export sizes | Max slides | Rotatable |
|---|---|---|---|---|---|
| `android-phone` | Android phone | 1080×1920 | 1080×1920 (required), 1440×2560 | 8 | yes |
| `android-tablet-7` | Android 7" tablet | 1200×1920 | 1200×1920 | 8 | yes |
| `android-tablet-10` | Android 10" tablet | 1600×2560 | 1600×2560 | 8 | yes |
| `chromebook` | Chromebook | 1920×1080 | 1920×1080, 3840×2160 | 8 | no |
| `wear-os` | Wear OS | 1080×1080 | 1080×1080, 384×384 | 8 | no |
| `android-tv` | Android TV | 1920×1080 | 1920×1080, 3840×2160 | 8 | no |
| `android-tv-banner` | Android TV banner | 1280×720 | 1280×720 | 1 | no |
| `android-xr` | Android XR | 3840×2400 | 3840×2400 | 8 | no |
| `feature-graphic` | Feature graphic | 1024×500 | 1024×500 (required) | 1 | no |

## Promo banners

| id | Label | Design canvas | Export sizes | Max slides | Rotatable |
|---|---|---|---|---|---|
| `event-card` | In-App Event card (horizontal) | 1920×1080 | 1920×1080, 3840×2160 | 10 | no |
| `event-details` | In-App Event details (vertical) | 1080×1920 | 1080×1920, 2160×3840 | 10 | no |
| `play-promo` | Play promotional content (horizontal) | 1920×1080 | 1920×1080 | 10 | no |
| `promo-vertical` | Promo story (vertical) | 1080×1920 | 1080×1920 | 10 | no |
| `appstore-search` | App Store search creative (3:2) | 3840×2560 | 3840×2560, 1920×1280 | 1 | no |

## Store rules per device

### iPhone (`iphone`)

- Up to 10 screenshots. The first 3 show in search results, so they carry the story.
- No transparency. Export is opaque 24-bit PNG.
- One message per screenshot, short and large enough to read on a phone.

### iPad (`ipad`)

- Required if the app runs on iPad. Show real iPad layouts, not stretched iPhone UI.
- No transparency. Export is opaque 24-bit PNG.
- One message per screenshot, short and large enough to read on a phone.

### iPhone Duo outer (`iphone-duo-outer`)

- Becomes required for apps built with the iOS 27.1 SDK from April 2027.

### iPhone Duo inner (`iphone-duo-inner`)

- Becomes required for apps built with the iOS 27.1 SDK from April 2027.

### Apple Watch (`apple-watch`)

- Upload one size set. Keep text very short; the canvas is tiny.

### Mac (`mac`)

- 16:10, landscape only. Required for Mac apps.

### Apple TV (`apple-tv`)

- Landscape only. Required for Apple TV apps.

### Apple Vision Pro (`vision-pro`)

- Landscape only. Required for visionOS apps.

### Android phone (`android-phone`)

- 2 to 8 screenshots. Each side 320–3840 px, long side at most 2× the short side.
- JPEG or 24-bit PNG, no transparency.
- Avoid rankings, awards, prices or 'best/#1' claims in the image.

### Android 7" tablet (`android-tablet-7`)

- Up to 8. Show real tablet layouts.

### Android 10" tablet (`android-tablet-10`)

- Up to 8. Show real tablet layouts.

### Chromebook (`chromebook`)

- 16:9 landscape works best for large screens.

### Wear OS (`wear-os`)

- 1:1 ratio, at least 384 × 384.
- Show only the full-screen app UI: no device frame, no added text, no transparent background.
- Use a round mask only if your UI is round; the background must stay opaque.
- **No added text allowed.** Use only `screenshot` in recipe slides.

### Android TV (`android-tv`)

- At least one TV screenshot is required for TV apps. Show the actual TV experience.

### Android TV banner (`android-tv-banner`)

- Shown in the TV store listing. App name or logo, large and centred.

### Android XR (`android-xr`)

- 4 to 8 screenshots at 8:5.

### Feature graphic (`feature-graphic`)

- Exactly 1024 × 500, required for every listing.
- Doubles as the cover of your preview video.
- Safe area: Keep key content centred; it is cropped on some surfaces and covered by the play button when you have a video.

### In-App Event card (horizontal) (`event-card`)

- App Store In-App Event card, 16:9.
- Avoid logos, added text and calls to action; Apple overlays the event name.
- Safe area: About 75 px is cropped on the left and right. Apple adds its own gradient.

### In-App Event details (vertical) (`event-details`)

- App Store In-App Event details page, 9:16.
- Keep important content out of the bottom quarter.
- Safe area: The bottom ~510 px is blurred under the event text.

### Play promotional content (horizontal) (`play-promo`)

- Google Play promotional content image, 16:9. Check current specs in Play Console before uploading.

### Promo story (vertical) (`promo-vertical`)

- Generic vertical promo for stories, reels and ads.
- Safe area: Stories cover the top and bottom with UI.

### App Store search creative (3:2) (`appstore-search`)

- Creative asset for App Store search results. No alpha channel or transparency.

