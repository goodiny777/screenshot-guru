import { Validator } from "@cfworker/json-schema";
import { projectSchema } from "./schema";

// @cfworker/json-schema does not use eval/new Function, so it works under our CSP.
let validator: Validator | null = null;
const LEAF = new Set(["type", "enum", "const", "required", "additionalProperties", "propertyNames", "minItems", "minProperties", "minimum", "maximum", "exclusiveMinimum", "minLength", "false"]);

export type SchemaIssue = { path: string; message: string };

/**
 * Validate project JSON. Returns readable issues, one per JSON path, deepest first.
 * Paths use JSON Pointer ("/decks/iphone/slides/0/layout"), the same as pack_project.py.
 */
export function validateProject(json: unknown): SchemaIssue[] {
  validator ??= new Validator(projectSchema() as never, "2020-12", false);
  // Validate what a file would contain: drops undefined values from live objects
  // (the validator throws on them, e.g. loadProject() called with an in-memory project).
  const r = validator.validate(json === undefined ? null : JSON.parse(JSON.stringify(json)));
  if (r.valid) return [];
  const byPath = new Map<string, SchemaIssue>();
  for (const e of r.errors) {
    if (!LEAF.has(e.keyword)) continue;
    const path = e.instanceLocation.replace(/^#/, "") || "/";
    if (!byPath.has(path)) byPath.set(path, { path, message: e.error });
  }
  return [...byPath.values()].sort((a, b) => b.path.split("/").length - a.path.split("/").length);
}
