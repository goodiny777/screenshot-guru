// JSON Schema (draft 2020-12) for project.json — the single contract shared by
// the importer, the skill's pack script and the docs. Device ids, template ids
// and layouts are generated from the app, so the schema cannot drift from it.
// build-skill.mjs writes it to public/project.schema.json and the skill.
import { DEVICES } from "./devices";
import { STYLES } from "./templates";

export const SCHEMA_ID = "screenshot-guru/1";
export const LAYOUTS = ["hero", "top", "duo", "claim", "span", "side", "full", "icon"] as const;

export function projectSchema() {
  const localized = { $ref: "#/$defs/localized" };
  const color = { type: "string", minLength: 1 };
  const stops = { type: "array", minItems: 2, items: { type: "object", required: ["offset", "color"], properties: { offset: { type: "number", minimum: 0, maximum: 1 }, color } } };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://screenshot-guru-11436.web.app/project.schema.json",
    title: "screenshot-guru project",
    description: "project.json inside a screenshot-guru project zip. Decks are keyed by device id and use either the short recipe format or the full layer format.",
    // Annotation (not a validation keyword): store slide limit per device id.
    "x-max-slides": Object.fromEntries(DEVICES.map((d) => [d.id, d.slides.max])),
    type: "object",
    required: ["schema", "decks"],
    properties: {
      schema: { const: SCHEMA_ID },
      name: { type: "string" },
      locales: { type: "array", minItems: 1, items: { type: "string", minLength: 2 } },
      activeLocale: { type: "string" },
      activeDevice: { type: "string" },
      icon: { type: "string" },
      fonts: { type: "object", additionalProperties: { type: "string" } },
      decks: {
        type: "object",
        minProperties: 1,
        propertyNames: { enum: DEVICES.map((d) => d.id) },
        additionalProperties: {
          // Full decks have slides with layers; everything else is a recipe.
          if: { type: "object", required: ["slides"], properties: { slides: { type: "array", minItems: 1, items: { type: "object", required: ["layers"] } } } },
          then: { $ref: "#/$defs/fullDeck" },
          else: { $ref: "#/$defs/recipeDeck" },
        },
      },
    },
    $defs: {
      localized: { anyOf: [{ type: "string" }, { type: "object", additionalProperties: { type: "string" } }] },
      paint: {
        type: "object",
        required: ["type"],
        properties: { type: { enum: ["solid", "linear", "radial"] } },
        allOf: [
          { if: { properties: { type: { const: "solid" } } }, then: { required: ["color"], properties: { color } } },
          { if: { properties: { type: { const: "linear" } } }, then: { required: ["angle", "stops"], properties: { angle: { type: "number" }, stops } } },
          { if: { properties: { type: { const: "radial" } } }, then: { required: ["cx", "cy", "r", "stops"], properties: { cx: { type: "number" }, cy: { type: "number" }, r: { type: "number" }, stops } } },
        ],
      },
      background: {
        type: "object",
        required: ["paint"],
        properties: {
          paint: { $ref: "#/$defs/paint" },
          orbs: { type: "array", items: { type: "object", required: ["x", "y", "r", "color", "opacity"], properties: { x: { type: "number" }, y: { type: "number" }, r: { type: "number" }, color, opacity: { type: "number", minimum: 0, maximum: 1 } } } },
          pattern: { type: "object", required: ["type"], properties: { type: { enum: ["none", "dots", "grid", "lines", "waves"] }, color, opacity: { type: "number", minimum: 0, maximum: 1 }, size: { type: "number", minimum: 1 } } },
          noise: { type: "number", minimum: 0, maximum: 1 },
          vignette: { type: "number", minimum: 0, maximum: 1 },
        },
      },
      recipeSlide: {
        type: "object",
        additionalProperties: false,
        properties: {
          layout: { enum: [...LAYOUTS] },
          label: localized,
          headline: localized,
          subline: localized,
          screenshot: localized,
          screenshot2: localized,
          background: { $ref: "#/$defs/background" },
        },
      },
      recipeDeck: {
        type: "object",
        required: ["template", "slides"],
        additionalProperties: false,
        properties: {
          template: { enum: STYLES.map((s) => s.id) },
          orientation: { enum: ["portrait", "landscape"] },
          style: {
            type: "object",
            additionalProperties: false,
            properties: { accent: color, textColor: color, frameColor: color, font: { type: "string" }, background: { $ref: "#/$defs/background" } },
          },
          slides: { type: "array", minItems: 1, items: { $ref: "#/$defs/recipeSlide" } },
        },
      },
      layer: {
        type: "object",
        required: ["type", "x", "y", "w", "h"],
        properties: {
          type: { enum: ["text", "image", "device", "shape"] },
          id: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          w: { type: "number", exclusiveMinimum: 0 },
          h: { type: "number", exclusiveMinimum: 0 },
          rotation: { type: "number" },
          opacity: { type: "number", minimum: 0, maximum: 1 },
          text: { type: "object", additionalProperties: { type: "string" } },
          asset: { type: "string" },
          assets: { type: "object", additionalProperties: { type: "string" } },
          frame: { enum: ["phone", "phone-android", "tablet", "watch", "watch-round", "laptop", "tv", "browser", "none"] },
          shape: { enum: ["rect", "ellipse", "star", "blob"] },
          fill: { $ref: "#/$defs/paint" },
        },
        allOf: [{ if: { properties: { type: { const: "text" } } }, then: { required: ["text", "font", "weight", "size", "fill"] } }],
      },
      fullDeck: {
        type: "object",
        required: ["background", "slides"],
        properties: {
          device: { type: "string" },
          orientation: { enum: ["portrait", "landscape"] },
          background: { $ref: "#/$defs/background" },
          spanBackground: { type: "boolean" },
          template: { type: "string" },
          slides: { type: "array", minItems: 1, items: { type: "object", required: ["layers"], properties: { id: { type: "string" }, background: { $ref: "#/$defs/background" }, layers: { type: "array", items: { $ref: "#/$defs/layer" } } } } },
        },
      },
    },
  } as const;
}
