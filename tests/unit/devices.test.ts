import { describe, expect, it } from "vitest";
import { DEVICES, sizesFor } from "../../src/model/devices";

describe("device catalogue invariants", () => {
  it("ids are unique kebab-case", () => {
    const ids = DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
  });
  it("every device has at least one size, rules and a sane slide limit", () => {
    for (const d of DEVICES) {
      expect(d.sizes.length, d.id).toBeGreaterThan(0);
      expect(d.rules.length, d.id).toBeGreaterThan(0);
      expect(d.slides.max, d.id).toBeGreaterThanOrEqual(d.slides.suggested);
    }
  });
  it("export sizes keep the design canvas aspect within 8% (centre-crop stays small)", () => {
    for (const d of DEVICES)
      for (const s of d.sizes) {
        const r = s.w / s.h / (d.canvas.w / d.canvas.h);
        expect(Math.abs(1 - r), `${d.id} ${s.w}x${s.h}`).toBeLessThan(0.08);
      }
  });
  it("Google Play images: each side 320–3840 px, long side at most 2× short side", () => {
    for (const d of DEVICES.filter((x) => x.store === "google" && x.id !== "feature-graphic"))
      for (const o of ["portrait", "landscape"] as const)
        for (const s of sizesFor(d.id, o)) {
          expect(Math.min(s.w, s.h), `${d.id} ${s.w}x${s.h}`).toBeGreaterThanOrEqual(320);
          expect(Math.max(s.w, s.h), `${d.id} ${s.w}x${s.h}`).toBeLessThanOrEqual(3840);
          expect(Math.max(s.w, s.h) / Math.min(s.w, s.h), `${d.id} ${s.w}x${s.h}`).toBeLessThanOrEqual(2);
        }
  });
  it("feature graphic is exactly 1024×500", () => {
    expect(DEVICES.find((d) => d.id === "feature-graphic")!.sizes).toEqual([expect.objectContaining({ w: 1024, h: 500 })]);
  });
  it("Wear OS is square and forbids text and frames", () => {
    const w = DEVICES.find((d) => d.id === "wear-os")!;
    w.sizes.forEach((s) => expect(s.w).toBe(s.h));
    expect(w.noText && w.noFrame).toBe(true);
  });
  it("landscape sizes are the portrait ones swapped (rotatable only)", () => {
    expect(sizesFor("iphone", "landscape")[0]).toMatchObject({ w: 2868, h: 1320 });
    expect(sizesFor("mac", "landscape")[0]).toMatchObject({ w: 2880, h: 1800 });
  });
});
