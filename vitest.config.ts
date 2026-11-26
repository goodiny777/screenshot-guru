import { defineConfig } from "vitest/config";

// Unit tests: pure logic only. Anything that needs a real canvas, IndexedDB
// or fonts is an e2e test (tests/e2e) and runs in a real browser.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "jsdom",
    // idb-keyval opens IndexedDB at import time; jsdom has none.
    setupFiles: ["fake-indexeddb/auto"],
  },
});
