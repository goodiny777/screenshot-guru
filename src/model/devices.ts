import type { FrameKind } from "./types";

export type Size = { w: number; h: number; label: string; required?: boolean };

export type DeviceSpec = {
  id: string;
  label: string;
  store: "apple" | "google" | "promo";
  group: string;
  /** Design canvas, portrait (or the only orientation). */
  canvas: { w: number; h: number };
  sizes: Size[];
  /** If set, the deck can switch orientation; landscape sizes are the portrait ones swapped. */
  rotatable?: boolean;
  frame: FrameKind;
  /** Suggested number of slides and the store maximum. */
  slides: { suggested: number; max: number };
  /** Areas the store crops or covers. Values in design px. */
  safe?: { left?: number; right?: number; top?: number; bottom?: number; note: string };
  /** Store rules shown in the editor and checked on export. */
  rules: string[];
  /** Store rule: the asset must not contain text layers / device frames. */
  noText?: boolean;
  noFrame?: boolean;
  /** Prefer JPEG (Play rejects alpha; both stores reject transparency). */
  jpegOk?: boolean;
  /** Official page the sizes and rules were read from. */
  source: string;
  /** Date (ISO) the source was last read. */
  checked: string;
  /** Largest file the store accepts for one image, in bytes (export warns above it). */
  maxBytes?: number;
  /** Anything not confirmed on the official page, shown to users and tracked in the spec. */
  verify?: string;
};

const APPLE_SHOTS = "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications";
const APPLE_CREATIVE = "https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications";
const APPLE_EVENTS = "https://developer.apple.com/help/app-store-connect/reference/in-app-event-media-and-audio-specifications";
const PLAY_ASSETS = "https://support.google.com/googleplay/android-developer/answer/9866151";
const PLAY_PROMO = "https://support.google.com/googleplay/android-developer/answer/12932541";
const CHECKED = "2026-11-26";
/** Play's 8 MB per-image limit is quoted by ASO references; not visible in the help text read on CHECKED. */
const PLAY_MAX = 8 * 1024 * 1024;
const PLAY_MAX_NOTE = "8 MB per image limit comes from ASO references; confirm in Play Console.";

const iphoneRules = [
  "Up to 10 screenshots. The first 3 show in search results, so they carry the story.",
  "No transparency. Export is opaque 24-bit PNG.",
  "One message per screenshot, short and large enough to read on a phone.",
];

export const DEVICES: DeviceSpec[] = [
  // ---------------- Apple App Store ----------------
  {
    id: "iphone", source: APPLE_SHOTS, checked: CHECKED, label: "iPhone", store: "apple", group: "App Store",
    canvas: { w: 1320, h: 2868 }, rotatable: true, frame: "phone",
    sizes: [
      { label: '6.9" (Dynamic Island large)', w: 1320, h: 2868 },
      { label: '6.9" alt', w: 1290, h: 2796 },
      { label: '6.9" alt 2', w: 1260, h: 2736 },
      { label: '6.5" (Face ID large)', w: 1284, h: 2778 },
      { label: '6.5" alt', w: 1242, h: 2688 },
      { label: '6.1" (Dynamic Island medium)', w: 1206, h: 2622, required: true },
      { label: '6.1" alt', w: 1179, h: 2556 },
    ],
    slides: { suggested: 6, max: 10 }, rules: iphoneRules,
  },
  {
    id: "ipad", source: APPLE_SHOTS, checked: CHECKED, label: "iPad", store: "apple", group: "App Store",
    canvas: { w: 2064, h: 2752 }, rotatable: true, frame: "tablet",
    sizes: [
      { label: '13"', w: 2064, h: 2752, required: true },
      { label: '12.9" iPad Pro', w: 2048, h: 2732 },
    ],
    slides: { suggested: 6, max: 10 },
    rules: ["Required if the app runs on iPad. Show real iPad layouts, not stretched iPhone UI.", ...iphoneRules.slice(1)],
  },
  {
    id: "iphone-duo-outer", source: APPLE_SHOTS, checked: CHECKED, label: "iPhone Duo outer", store: "apple", group: "App Store",
    canvas: { w: 1398, h: 2034 }, rotatable: true, frame: "phone",
    sizes: [{ label: "Outer display", w: 1398, h: 2034 }],
    slides: { suggested: 5, max: 10 },
    rules: ["Becomes required for apps built with the iOS 27.1 SDK from April 2027."],
  },
  {
    id: "iphone-duo-inner", source: APPLE_SHOTS, checked: CHECKED, label: "iPhone Duo inner", store: "apple", group: "App Store",
    canvas: { w: 2007, h: 2853 }, rotatable: true, frame: "tablet",
    sizes: [{ label: "Inner display", w: 2007, h: 2853 }],
    slides: { suggested: 5, max: 10 },
    rules: ["Becomes required for apps built with the iOS 27.1 SDK from April 2027."],
  },
  {
    id: "apple-watch", source: APPLE_SHOTS, checked: CHECKED, label: "Apple Watch", store: "apple", group: "App Store",
    canvas: { w: 422, h: 514 }, frame: "watch",
    sizes: [
      { label: "Ultra 4 / Ultra 3", w: 422, h: 514 },
      { label: "Ultra 2 / Ultra", w: 410, h: 502 },
      { label: "Series 12 / 11 / 10", w: 416, h: 496 },
      { label: "Series 9 / 8 / 7", w: 396, h: 484 },
      { label: "Series 6 / 5 / 4 / SE", w: 368, h: 448 },
      { label: "Series 3 / 2 / 1", w: 312, h: 390 },
    ],
    slides: { suggested: 4, max: 10 },
    rules: ["Upload one size set and use the same size in every language. Keep text very short; the canvas is tiny."],
  },
  {
    id: "mac", source: APPLE_SHOTS, checked: CHECKED, label: "Mac", store: "apple", group: "App Store",
    canvas: { w: 2880, h: 1800 }, frame: "laptop",
    sizes: [
      { label: "2880 × 1800", w: 2880, h: 1800 },
      { label: "2560 × 1600", w: 2560, h: 1600 },
      { label: "1440 × 900", w: 1440, h: 900 },
      { label: "1280 × 800", w: 1280, h: 800 },
    ],
    slides: { suggested: 5, max: 10 }, rules: ["16:10, landscape only. Required for Mac apps."],
  },
  {
    id: "apple-tv", source: APPLE_SHOTS, checked: CHECKED, label: "Apple TV", store: "apple", group: "App Store",
    canvas: { w: 3840, h: 2160 }, frame: "tv",
    sizes: [
      { label: "4K", w: 3840, h: 2160 },
      { label: "HD", w: 1920, h: 1080 },
    ],
    slides: { suggested: 5, max: 10 }, rules: ["Landscape only. Required for Apple TV apps."],
  },
  {
    id: "vision-pro", source: APPLE_SHOTS, checked: CHECKED, label: "Apple Vision Pro", store: "apple", group: "App Store",
    canvas: { w: 3840, h: 2160 }, frame: "none",
    sizes: [{ label: "3840 × 2160", w: 3840, h: 2160 }],
    slides: { suggested: 5, max: 10 }, rules: ["Landscape only. Required for visionOS apps."],
  },
  // ---------------- Google Play ----------------
  {
    id: "android-phone", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: "Android phone", store: "google", group: "Google Play",
    canvas: { w: 1080, h: 1920 }, rotatable: true, frame: "phone-android", jpegOk: true,
    sizes: [
      { label: "1080 × 1920 (recommended)", w: 1080, h: 1920, required: true },
      { label: "1440 × 2560", w: 1440, h: 2560 },
    ],
    slides: { suggested: 6, max: 8 },
    rules: [
      "2 to 8 screenshots. Each side 320–3840 px, long side at most 2× the short side.",
      "JPEG or 24-bit PNG, no transparency.",
      "Avoid rankings, awards, prices or 'best/#1' claims in the image.",
    ],
  },
  {
    id: "android-tablet-7", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: 'Android 7" tablet', store: "google", group: "Google Play",
    canvas: { w: 1200, h: 1920 }, rotatable: true, frame: "tablet", jpegOk: true,
    sizes: [{ label: '7" tablet', w: 1200, h: 1920 }],
    slides: { suggested: 4, max: 8 }, rules: ["Up to 8. Show real tablet layouts."],
  },
  {
    id: "android-tablet-10", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: 'Android 10" tablet', store: "google", group: "Google Play",
    canvas: { w: 1600, h: 2560 }, rotatable: true, frame: "tablet", jpegOk: true,
    sizes: [{ label: '10" tablet', w: 1600, h: 2560 }],
    slides: { suggested: 4, max: 8 }, rules: ["Up to 8. Show real tablet layouts."],
  },
  {
    id: "chromebook", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: "Chromebook", store: "google", group: "Google Play",
    canvas: { w: 1920, h: 1080 }, frame: "laptop", jpegOk: true,
    sizes: [
      { label: "1920 × 1080", w: 1920, h: 1080 },
      { label: "3840 × 2160", w: 3840, h: 2160 },
    ],
    slides: { suggested: 4, max: 8 }, rules: ["16:9 landscape works best for large screens."],
  },
  {
    id: "wear-os", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: "Wear OS", store: "google", group: "Google Play",
    canvas: { w: 1080, h: 1080 }, frame: "none", noText: true, noFrame: true, jpegOk: true,
    sizes: [
      { label: "1080 × 1080", w: 1080, h: 1080 },
      { label: "384 × 384 (minimum)", w: 384, h: 384 },
    ],
    slides: { suggested: 4, max: 8 },
    rules: [
      "1:1 ratio, at least 384 × 384.",
      "Show only the full-screen app UI: no device frame, no added text, no transparent background.",
      "Use a round mask only if your UI is round; the background must stay opaque.",
    ],
  },
  {
    id: "android-tv", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: "Android TV", store: "google", group: "Google Play",
    canvas: { w: 1920, h: 1080 }, frame: "tv", jpegOk: true,
    sizes: [
      { label: "1920 × 1080", w: 1920, h: 1080 },
      { label: "3840 × 2160", w: 3840, h: 2160 },
    ],
    slides: { suggested: 4, max: 8 },
    rules: ["At least one TV screenshot is required for TV apps. Show the actual TV experience."],
  },
  {
    id: "android-tv-banner", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: "A TV banner is required for TV apps; the 1280 × 720 size is not confirmed on the help page read. Check Play Console.", label: "Android TV banner", store: "google", group: "Google Play",
    canvas: { w: 1280, h: 720 }, frame: "none", jpegOk: true,
    sizes: [{ label: "1280 × 720", w: 1280, h: 720 }],
    slides: { suggested: 1, max: 1 },
    rules: ["Shown in the TV store listing. App name or logo, large and centred."],
  },
  {
    id: "android-xr", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: "Android XR", store: "google", group: "Google Play",
    canvas: { w: 3840, h: 2400 }, frame: "none", jpegOk: true,
    sizes: [{ label: "3840 × 2400 (8:5)", w: 3840, h: 2400 }],
    slides: { suggested: 4, max: 8 }, rules: ["4 to 8 screenshots at 8:5."],
  },
  {
    id: "feature-graphic", source: PLAY_ASSETS, checked: CHECKED, maxBytes: PLAY_MAX, verify: PLAY_MAX_NOTE, label: "Feature graphic", store: "google", group: "Google Play",
    canvas: { w: 1024, h: 500 }, frame: "none", jpegOk: true,
    sizes: [{ label: "1024 × 500", w: 1024, h: 500, required: true }],
    slides: { suggested: 1, max: 1 },
    safe: { left: 48, right: 48, top: 30, bottom: 30, note: "Keep key content centred; it is cropped on some surfaces and covered by the play button when you have a video." },
    rules: ["Exactly 1024 × 500, required for every listing.", "Doubles as the cover of your preview video."],
  },
  // ---------------- Promo banners ----------------
  {
    id: "event-card", source: APPLE_EVENTS, checked: CHECKED, label: "In-App Event card (horizontal)", store: "promo", group: "Promo banners",
    canvas: { w: 1920, h: 1080 }, frame: "none",
    sizes: [
      { label: "1920 × 1080", w: 1920, h: 1080 },
      { label: "3840 × 2160", w: 3840, h: 2160 },
    ],
    slides: { suggested: 1, max: 10 },
    safe: { left: 75, right: 75, note: "About 75 px is cropped on the left and right. Apple adds its own gradient." },
    rules: ["App Store In-App Event card, 16:9.", "Avoid logos, added text and calls to action; Apple overlays the event name."],
  },
  {
    id: "event-details", source: APPLE_EVENTS, checked: CHECKED, label: "In-App Event details (vertical)", store: "promo", group: "Promo banners",
    canvas: { w: 1080, h: 1920 }, frame: "none",
    sizes: [
      { label: "1080 × 1920", w: 1080, h: 1920 },
      { label: "2160 × 3840", w: 2160, h: 3840 },
    ],
    slides: { suggested: 1, max: 10 },
    safe: { bottom: 510, note: "The bottom ~510 px is blurred under the event text." },
    rules: ["App Store In-App Event details page, 9:16.", "Keep important content out of the bottom quarter."],
  },
  {
    id: "play-promo", source: PLAY_PROMO, checked: CHECKED, maxBytes: PLAY_MAX, verify: "Play requires a primary image and a square image for promotional content; exact pixel sizes are not stated in the help text read. Check Play Console.", label: "Play promotional content (horizontal)", store: "promo", group: "Promo banners",
    canvas: { w: 1920, h: 1080 }, frame: "none", jpegOk: true,
    sizes: [{ label: "1920 × 1080", w: 1920, h: 1080 }],
    slides: { suggested: 1, max: 10 },
    rules: ["Google Play promotional content image, 16:9. Check current specs in Play Console before uploading."],
  },
  {
    id: "promo-vertical", source: "", checked: CHECKED, verify: "Not a store slot: a generic 9:16 promo for stories, reels and ads.", label: "Promo story (vertical)", store: "promo", group: "Promo banners",
    canvas: { w: 1080, h: 1920 }, frame: "none", jpegOk: true,
    sizes: [{ label: "1080 × 1920", w: 1080, h: 1920 }],
    slides: { suggested: 1, max: 10 },
    safe: { top: 250, bottom: 340, note: "Stories cover the top and bottom with UI." },
    rules: ["Generic vertical promo for stories, reels and ads."],
  },
  {
    id: "appstore-search", source: APPLE_CREATIVE, checked: CHECKED, label: "App Store search creative (3:2)", store: "promo", group: "Promo banners",
    canvas: { w: 3840, h: 2560 }, frame: "none",
    sizes: [
      { label: "3840 × 2560", w: 3840, h: 2560 },
      { label: "1920 × 1280", w: 1920, h: 1280 },
    ],
    slides: { suggested: 1, max: 1 },
    rules: ["Creative asset for App Store search results, 3:2, from 1920 × 1280 to 3840 × 2560. JPEG or PNG, no alpha channel or transparency."],
  },
  {
    id: "appstore-header", source: APPLE_CREATIVE, checked: CHECKED, label: "App Store product page header (21:9)", store: "promo", group: "Promo banners",
    canvas: { w: 3840, h: 1646 }, frame: "none",
    sizes: [{ label: "3840 × 1646", w: 3840, h: 1646 }],
    slides: { suggested: 1, max: 1 },
    rules: ["Creative asset for the top of your product page (iOS 27 / iPadOS 27 and later), 21:9. JPEG or PNG, no alpha channel."],
  },
  {
    id: "appstore-universal", source: APPLE_CREATIVE, checked: CHECKED, label: "App Store universal creative (16:9)", store: "promo", group: "Promo banners",
    canvas: { w: 5244, h: 2950 }, frame: "none",
    sizes: [{ label: "5244 × 2950", w: 5244, h: 2950 }],
    slides: { suggested: 1, max: 1 },
    safe: { left: 700, right: 700, note: "One image for both header (21:9) and search (3:2): keep key content in the centre so both crops work." },
    rules: ["One image used for both the product page header and search results. PNG only, no alpha channel."],
  },
  {
    id: "play-promo-square", source: PLAY_PROMO, checked: CHECKED, label: "Play promotional content (square)", store: "promo", group: "Promo banners",
    canvas: { w: 1080, h: 1080 }, frame: "none", jpegOk: true, maxBytes: PLAY_MAX,
    verify: "Play requires a square image for promotional content; the pixel size is not stated in the help text read. Check Play Console.",
    sizes: [{ label: "1080 × 1080", w: 1080, h: 1080 }],
    slides: { suggested: 1, max: 10 },
    rules: ["Square image required with every Google Play promotional content event, shown on lists and other Play surfaces."],
  },
];

export const DEVICE_MAP: Record<string, DeviceSpec> = Object.fromEntries(DEVICES.map((d) => [d.id, d]));

export function getDevice(id: string): DeviceSpec {
  return DEVICE_MAP[id] ?? DEVICES[0];
}

/** Design canvas for a deck, taking orientation into account. */
export function canvasFor(id: string, orientation: "portrait" | "landscape") {
  const d = getDevice(id);
  const { w, h } = d.canvas;
  return orientation === "landscape" && d.rotatable ? { w: h, h: w } : { w, h };
}

export function sizesFor(id: string, orientation: "portrait" | "landscape"): Size[] {
  const d = getDevice(id);
  if (orientation === "landscape" && d.rotatable) return d.sizes.map((s) => ({ ...s, w: s.h, h: s.w }));
  return d.sizes;
}
