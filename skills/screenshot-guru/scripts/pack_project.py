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
DEVICES = {
    "iphone": 10, "ipad": 10, "iphone-duo-outer": 10, "iphone-duo-inner": 10, "apple-watch": 10,
    "mac": 10, "apple-tv": 10, "vision-pro": 10, "android-phone": 8, "android-tablet-7": 8,
    "android-tablet-10": 8, "chromebook": 8, "wear-os": 8, "android-tv": 8, "android-tv-banner": 1,
    "android-xr": 8, "feature-graphic": 1, "event-card": 10, "event-details": 10, "play-promo": 10,
    "promo-vertical": 10, "appstore-search": 1,
}
TEMPLATES = {
    "clean-light", "midnight-glow", "vivid-gradient", "pastel-dream", "swiss-bold", "aurora-glass",
    "neon-night", "paper-japandi", "candy-pop", "ocean-tilt", "panorama", "editorial-serif",
}
LAYOUTS = {"hero", "top", "duo", "claim", "span", "side", "full", "icon"}
BANNED = re.compile(r"\b(#1|no\.?\s?1|best|top[- ]rated|download now|install now|free trial|sale|% off)\b", re.I)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    base = os.path.dirname(os.path.abspath(args.project))
    with open(args.project, encoding="utf-8") as f:
        project = json.load(f)

    errors, warnings = [], []
    if project.get("schema") != "screenshot-guru/1":
        errors.append('schema must be "screenshot-guru/1"')
    locales = project.get("locales") or ["en"]
    decks = project.get("decks") or {}
    if not decks:
        errors.append("decks is empty")

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
        if dev not in DEVICES:
            errors.append(f"unknown device id '{dev}'")
            continue
        slides = deck.get("slides") or []
        if not slides:
            errors.append(f"{dev}: no slides")
        if len(slides) > DEVICES[dev]:
            errors.append(f"{dev}: {len(slides)} slides, the store allows {DEVICES[dev]}")
        if "template" in deck and deck["template"] not in TEMPLATES:
            errors.append(f"{dev}: unknown template '{deck['template']}'")
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
            if s.get("layout") and s["layout"] not in LAYOUTS:
                errors.append(f"{where}: unknown layout '{s['layout']}'")
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
