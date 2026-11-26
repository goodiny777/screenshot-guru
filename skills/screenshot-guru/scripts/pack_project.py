#!/usr/bin/env python3
"""Validate a screenshot-guru project.json and pack it with its images into a zip.

Usage:
    python3 pack_project.py project.json --out MyApp.screenshot-guru.zip

Image paths in project.json may be relative to the JSON file, absolute, or use ~.
Every referenced image is copied into the zip under assets/ and the JSON is rewritten
to point at it. Standard library only.
"""
import argparse
import json
import os
import re
import sys
import zipfile

IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif")
FONT_EXT = (".ttf", ".otf", ".woff", ".woff2")
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "project.schema.json")
BANNED = re.compile(r"(#1\b|\bno\.?\s?1\b|\bbest\b|\btop[- ]rated\b|\bdownload now\b|\binstall now\b|\bfree trial\b|\bsale\b|% off)", re.I)
TYPES = {"object": dict, "array": list, "string": str, "boolean": bool}


def load_schema():
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _type_ok(value, t):
    if t == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if t == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    return isinstance(value, TYPES[t])


def validate(value, schema, root, path="", out=None):
    """Small JSON Schema 2020-12 subset validator (the keywords project.schema.json uses).
    Appends (json_pointer, message) for leaf failures. Paths match the web app's importer."""
    if out is None:
        out = []
    if schema is True or schema is None:
        return out
    if schema is False:
        out.append((path or "/", "is not allowed"))
        return out
    if "$ref" in schema:
        node = root
        for part in schema["$ref"].lstrip("#/").split("/"):
            node = node[part]
        validate(value, node, root, path, out)
    if "type" in schema and not _type_ok(value, schema["type"]):
        out.append((path or "/", f"must be {schema['type']}"))
        return out
    if "const" in schema and value != schema["const"]:
        out.append((path or "/", f"must be {schema['const']!r}"))
    if "enum" in schema and value not in schema["enum"]:
        out.append((path or "/", f"must be one of: {', '.join(map(str, schema['enum']))}"))
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            out.append((path or "/", f"must be >= {schema['minimum']}"))
        if "maximum" in schema and value > schema["maximum"]:
            out.append((path or "/", f"must be <= {schema['maximum']}"))
        if "exclusiveMinimum" in schema and value <= schema["exclusiveMinimum"]:
            out.append((path or "/", f"must be > {schema['exclusiveMinimum']}"))
    if isinstance(value, str) and "minLength" in schema and len(value) < schema["minLength"]:
        out.append((path or "/", f"must have at least {schema['minLength']} characters"))
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            out.append((path or "/", f"must have at least {schema['minItems']} items"))
        if "items" in schema:
            for i, item in enumerate(value):
                validate(item, schema["items"], root, f"{path}/{i}", out)
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                out.append((path or "/", f"is missing required property '{key}'"))
        if "minProperties" in schema and len(value) < schema["minProperties"]:
            out.append((path or "/", f"must have at least {schema['minProperties']} properties"))
        props = schema.get("properties", {})
        for key, sub in value.items():
            if "propertyNames" in schema:
                names = schema["propertyNames"].get("enum")
                if names is not None and key not in names:
                    out.append((f"{path}/{key}", f"unknown key; must be one of: {', '.join(names)}"))
                    continue
            if key in props:
                validate(sub, props[key], root, f"{path}/{key}", out)
            elif "additionalProperties" in schema:
                ap = schema["additionalProperties"]
                if ap is False:
                    out.append((f"{path}/{key}", "is not an allowed property"))
                else:
                    validate(sub, ap, root, f"{path}/{key}", out)
    for sub in schema.get("allOf", []):
        validate(value, sub, root, path, out)
    if "anyOf" in schema:
        if not any(not validate(value, sub, root, path, []) for sub in schema["anyOf"]):
            out.append((path or "/", "does not match any allowed form"))
    if "if" in schema:
        branch = schema.get("then") if not validate(value, schema["if"], root, path, []) else schema.get("else")
        if branch is not None:
            validate(value, branch, root, path, out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    base = os.path.dirname(os.path.abspath(args.project))
    with open(args.project, encoding="utf-8") as f:
        project = json.load(f)

    errors, warnings = [], []
    schema = load_schema()
    for pointer, message in validate(project, schema, schema):
        errors.append(f"{pointer} {message}")
    device_ids = set(schema["properties"]["decks"]["propertyNames"]["enum"])
    locales = project.get("locales") or ["en"]
    decks = project.get("decks") or {}

    files = {}  # zip path -> source path

    def resolve(value, where):
        if not isinstance(value, str) or not value:
            return value
        if value.startswith(("http://", "https://", "data:")):
            warnings.append(f"{where}: remote/data images are not packed: {value[:40]}")
            return value
        src = os.path.expanduser(value)
        if not os.path.isabs(src):
            src = os.path.join(base, src)
        if not os.path.isfile(src):
            errors.append(f"{where}: file not found: {value}")
            return value
        ext = os.path.splitext(src)[1].lower()
        if ext not in IMAGE_EXT + FONT_EXT:
            errors.append(f"{where}: unsupported file type {ext}")
            return value
        rel = value if not os.path.isabs(os.path.expanduser(value)) else os.path.basename(src)
        rel = rel.replace("\\", "/").lstrip("./")
        if not rel.startswith("assets/"):
            rel = "assets/" + rel
        # avoid collisions between different files with the same name
        while rel in files and os.path.abspath(files[rel]) != os.path.abspath(src):
            stem, e = os.path.splitext(rel)
            rel = stem + "_1" + e
        files[rel] = src
        return rel

    def resolve_any(value, where):
        if isinstance(value, dict):
            return {k: resolve(v, f"{where}.{k}") for k, v in value.items()}
        return resolve(value, where)

    def text_of(v):
        if isinstance(v, dict):
            return " ".join(str(x) for x in v.values())
        return str(v or "")

    if "icon" in project:
        project["icon"] = resolve(project["icon"], "icon")
    for fam, path in (project.get("fonts") or {}).items():
        project["fonts"][fam] = resolve(path, f"fonts.{fam}")

    for dev, deck in decks.items():
        if dev not in device_ids:
            continue  # already reported by the schema
        slides = deck.get("slides") or []
        max_slides = schema.get("x-max-slides", {}).get(dev)
        if max_slides is not None and len(slides) > max_slides:
            errors.append(f"/decks/{dev}/slides {len(slides)} slides, the store allows {max_slides}")
        full = slides and all(isinstance(s, dict) and "layers" in s for s in slides)
        for i, s in enumerate(slides):
            where = f"{dev}.slides[{i}]"
            if full:
                for layer in s.get("layers", []):
                    if layer.get("type") in ("device", "image"):
                        layer["asset"] = resolve(layer.get("asset"), f"{where}.{layer.get('id')}")
                        if isinstance(layer.get("assets"), dict):
                            layer["assets"] = resolve_any(layer["assets"], f"{where}.{layer.get('id')}.assets")
                continue
            for key in ("screenshot", "screenshot2"):
                if key in s:
                    s[key] = resolve_any(s[key], f"{where}.{key}")
            hl = s.get("headline")
            if dev == "wear-os" and (hl or s.get("label") or s.get("subline")):
                warnings.append(f"{where}: Wear OS does not allow added text; it will be dropped")
            words = len(re.sub(r"\*\*", "", text_of(hl if not isinstance(hl, dict) else hl.get(locales[0], ""))).split())
            if words > 9:
                warnings.append(f"{where}: headline has {words} words; aim for 3-7")
            if dev.startswith("android") or dev in ("feature-graphic", "wear-os", "chromebook", "play-promo"):
                if BANNED.search(text_of(hl)) or BANNED.search(text_of(s.get("subline"))):
                    warnings.append(f"{where}: Google Play disallows rankings, 'best', prices and calls to action in images")
            if isinstance(hl, dict):
                for loc in locales:
                    if loc not in hl:
                        warnings.append(f"{where}: headline has no '{loc}' translation")

    for w in warnings:
        print("warning:", w)
    if errors:
        for e in errors:
            print("error:", e)
        sys.exit(1)

    out = args.out or (re.sub(r"\W+", "-", project.get("name", "app")).strip("-") + ".screenshot-guru.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("project.json", json.dumps(project, ensure_ascii=False, indent=2))
        for rel, src in files.items():
            z.write(src, rel)
    print(f"ok: {out} ({len(files)} files, {len(decks)} decks)")
    print("Next: open https://screenshot-guru-11436.web.app and drop this zip onto the page.")


if __name__ == "__main__":
    main()
