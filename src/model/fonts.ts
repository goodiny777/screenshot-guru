// Curated Google Fonts. Loaded on demand from fonts.googleapis.com, so nothing is bundled.
// Noto families cover Cyrillic, Greek, Arabic, Hebrew and CJK for localized decks.

export type FontDef = { family: string; weights: number[]; italic?: boolean; category: "sans" | "serif" | "display" | "hand" | "script" };

export const FONTS: FontDef[] = [
  { family: "Inter", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "sans" },
  { family: "Plus Jakarta Sans", weights: [400, 500, 600, 700, 800], italic: true, category: "sans" },
  { family: "Manrope", weights: [400, 500, 600, 700, 800], category: "sans" },
  { family: "DM Sans", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "sans" },
  { family: "Poppins", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "sans" },
  { family: "Montserrat", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "sans" },
  { family: "Outfit", weights: [400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Sora", weights: [400, 500, 600, 700, 800], category: "sans" },
  { family: "Space Grotesk", weights: [400, 500, 600, 700], category: "sans" },
  { family: "Nunito", weights: [400, 600, 700, 800, 900], italic: true, category: "sans" },
  { family: "Rubik", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "sans" },
  { family: "Bricolage Grotesque", weights: [400, 500, 600, 700, 800], category: "display" },
  { family: "Unbounded", weights: [400, 500, 600, 700, 800, 900], category: "display" },
  { family: "Syne", weights: [400, 500, 600, 700, 800], category: "display" },
  { family: "Bebas Neue", weights: [400], category: "display" },
  { family: "Anton", weights: [400], category: "display" },
  { family: "Fraunces", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "serif" },
  { family: "Playfair Display", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "serif" },
  { family: "DM Serif Display", weights: [400], italic: true, category: "serif" },
  { family: "Instrument Serif", weights: [400], italic: true, category: "serif" },
  { family: "Caveat", weights: [400, 500, 600, 700], category: "hand" },
  { family: "Noto Sans", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "sans" },
  { family: "Noto Serif", weights: [400, 500, 600, 700, 800, 900], italic: true, category: "serif" },
  { family: "Noto Sans Arabic", weights: [400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Noto Sans Hebrew", weights: [400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Noto Sans JP", weights: [400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Noto Sans KR", weights: [400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Noto Sans SC", weights: [400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Noto Sans Georgian", weights: [400, 500, 600, 700, 800, 900], category: "sans" },
];

const loaded = new Map<string, Promise<void>>();
const custom = new Set<string>();

export function markCustomFont(family: string) {
  custom.add(family);
}

function cssUrl(f: FontDef) {
  const fam = f.family.replace(/ /g, "+");
  if (f.italic) {
    const pairs = [...f.weights.map((w) => `0,${w}`), ...f.weights.map((w) => `1,${w}`)].join(";");
    return `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${pairs}&display=swap`;
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${f.weights.join(";")}&display=swap`;
}

/** Add the stylesheet for a Google font once. Resolves when the CSS (not the files) is in. */
function ensureCss(family: string): Promise<void> {
  if (custom.has(family)) return Promise.resolve();
  const def = FONTS.find((f) => f.family === family);
  if (!def) return Promise.resolve();
  if (loaded.has(family)) return loaded.get(family)!;
  const p = new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl(def);
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
  loaded.set(family, p);
  return p;
}

/** Load the exact faces (and unicode subsets for the given text) needed to draw. */
export async function ensureFonts(specs: { font: string; weight: number; italic?: boolean; text?: string }[]) {
  await Promise.all([...new Set(specs.map((s) => s.font))].map(ensureCss));
  await Promise.all(
    specs.map((s) =>
      document.fonts.load(`${s.italic ? "italic " : ""}${s.weight} 40px "${s.font}"`, s.text || "Aa").catch(() => undefined),
    ),
  );
}

export function nearestWeight(family: string, weight: number) {
  const def = FONTS.find((f) => f.family === family);
  if (!def) return weight;
  return def.weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
}
