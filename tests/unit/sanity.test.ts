import { describe, expect, it } from "vitest";
import { DEVICES } from "../../src/model/devices";
import { STYLES } from "../../src/model/templates";

// Proves the unit layer runs against real app modules.
describe("unit layer sanity", () => {
  it("loads the device catalogue with unique ids", () => {
    const ids = DEVICES.map((d) => d.id);
    expect(ids.length).toBeGreaterThan(15);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("ships exactly 12 built-in templates", () => {
    expect(STYLES).toHaveLength(12);
  });
});
