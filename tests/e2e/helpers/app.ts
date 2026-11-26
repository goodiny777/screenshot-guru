import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import type { Page } from "@playwright/test";

export const FIXTURE_ZIP = path.resolve("tests/fixtures/generated/habitly.zip");

/** Typed handle to window.screenshotGuru inside page.evaluate. */
export type Api = Record<string, (...args: never[]) => unknown>;

export async function openApp(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => (window as unknown as { screenshotGuru?: unknown }).screenshotGuru);
}

export async function loadFixture(page: Page) {
  if (!fs.existsSync(FIXTURE_ZIP)) throw new Error("Run `npm run fixtures` first");
  const b64 = fs.readFileSync(FIXTURE_ZIP).toString("base64");
  return page.evaluate((b) => (window as unknown as { screenshotGuru: { loadProjectZip(s: string): Promise<{ devices: string[]; warnings: string[]; assets: number }> } }).screenshotGuru.loadProjectZip(b), b64);
}

export function decodePng(bytes: Uint8Array) {
  // pngjs exposes colorType on the parsed metadata; 2 = RGB, 6 = RGBA
  const png = PNG.sync.read(Buffer.from(bytes));
  const colorType = (png as unknown as { colorType?: number }).colorType;
  return { width: png.width, height: png.height, colorType, data: png.data };
}

export function dataUrlToPng(url: string) {
  return decodePng(Buffer.from(url.split(",")[1], "base64"));
}

export function unzip(b64: string) {
  return unzipSync(Buffer.from(b64, "base64"));
}

/** Count sampled pixels within `tol` of an RGB colour. */
export function countColour(img: { width: number; height: number; data: Uint8Array | Buffer }, hex: string, tol = 18, step = 4) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  let n = 0;
  for (let y = 0; y < img.height; y += step)
    for (let x = 0; x < img.width; x += step) {
      const i = (y * img.width + x) * 4;
      if (Math.abs(img.data[i] - r) <= tol && Math.abs(img.data[i + 1] - g) <= tol && Math.abs(img.data[i + 2] - b) <= tol) n++;
    }
  return n;
}

export function column(img: { width: number; height: number; data: Uint8Array | Buffer }, x: number, y0: number, y1: number) {
  const out: number[] = [];
  for (let y = y0; y < y1; y++) {
    const i = (y * img.width + x) * 4;
    out.push(img.data[i], img.data[i + 1], img.data[i + 2]);
  }
  return out;
}

export const meanAbsDiff = (a: number[], b: number[]) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
