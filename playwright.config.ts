import { defineConfig, devices } from "@playwright/test";

// CHROME_PATH lets a machine without Playwright's own Chromium use an installed
// Chrome (for example /usr/bin/google-chrome). CI installs Playwright Chromium.
const executablePath = process.env.CHROME_PATH || undefined;
const PORT = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath, args: executablePath ? ["--no-sandbox"] : [] },
  },
  projects: [
    {
      // Representative real user: English UI, UTC.
      name: "en-US",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1500, height: 940 }, locale: "en-US", timezoneId: "UTC", extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" } },
    },
    {
      // Adversarial flip (VR-09): a German browser must not change editor defaults.
      name: "de-DE-flip",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1500, height: 940 }, locale: "de-DE", timezoneId: "Europe/Berlin", extraHTTPHeaders: { "Accept-Language": "de-DE,de;q=0.9" } },
    },
  ],
  webServer: [
    {
      command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // dist/ served with the production headers from firebase.json (CSP checks)
      command: "node scripts/serve-dist.mjs 4174",
      url: "http://localhost:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
