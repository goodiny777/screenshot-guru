// Renders README images through the real app. Run via `npm run readme:images`
// (expects `vite preview` on :4173; CHROME_PATH may point to an installed Chrome).
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BUILD = process.env.README_BUILD || ".readme-build";
const OUT = path.join(BUILD, "shots");
fs.mkdirSync(OUT, { recursive: true });
const b64 = (f) => "data:image/png;base64," + fs.readFileSync(path.join(BUILD, "mock", `${f}.png`)).toString("base64");
const save = (name, url) => fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(url.split(",")[1], "base64"));

const executablePath = process.env.CHROME_PATH || undefined;
const browser = await chromium.launch({ executablePath, args: executablePath ? ["--no-sandbox"] : [] });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, deviceScaleFactor: 1.5 });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto("http://localhost:4173/");
await page.waitForFunction(() => window.screenshotGuru);

// assets
const ids = await page.evaluate(async (files) => {
  const api = window.screenshotGuru;
  const out = {};
  for (const [k, v] of Object.entries(files)) out[k] = await api.addAsset("mock-" + k, v);
  return out;
}, Object.fromEntries(["today", "stats", "plan", "focus", "watch", "wear", "icon"].map((k) => [k, b64(k)])));

// 1) template gallery: first 3 slides of each template with the same copy
const templates = await page.evaluate(() => window.screenshotGuru.listTemplates());
for (const t of templates) {
  const urls = await page.evaluate(async ({ t, ids }) => {
    const api = window.screenshotGuru;
    await api.loadProject({ schema: "screenshot-guru/1", name: "Habitly", locales: ["en"], icon: ids.icon, decks: { iphone: { template: t, slides: [
      { layout: "hero", label: "DAILY HABITS", headline: "Build habits\nthat **stick**", screenshot: ids.today },
      { layout: "top", label: "PROGRESS", headline: "See your **streaks**\ngrow every day", screenshot: ids.stats },
      { layout: "duo", label: "PLANNING", headline: "Plan your **week**\nin a minute", screenshot: ids.plan, screenshot2: ids.focus },
    ] } } });
    return [await api.renderSlide("iphone", 0, { width: 330 }), await api.renderSlide("iphone", 1, { width: 330 }), await api.renderSlide("iphone", 2, { width: 330 })];
  }, { t: t.id, ids });
  urls.forEach((u, i) => save(`tpl-${t.id}-${i}`, u));
}
fs.writeFileSync(`${OUT}/templates.json`, JSON.stringify(templates));

// 2) full customization showcase: one connected deck, tilted devices crossing slide edges
await page.evaluate(async (ids) => {
  const api = window.screenshotGuru;
  await api.loadProject({ schema: "screenshot-guru/1", name: "Habitly", locales: ["en"], icon: ids.icon, decks: { iphone: {
    template: "aurora-glass",
    style: { accent: "#5eead4" },
    slides: [
      { layout: "hero", label: "DAILY HABITS", headline: "Build habits\nthat **stick**", screenshot: ids.today },
      { layout: "span", label: "PROGRESS", headline: "Watch your\n**streaks** grow", screenshot: ids.stats },
      { layout: "hero", label: "PLANNING", headline: "Plan the **week**\nin a minute", screenshot: ids.plan },
      { layout: "duo", label: "FOCUS", headline: "Deep work,\n**zero noise**", screenshot: ids.focus, screenshot2: ids.today },
      { layout: "claim", headline: "Start **free**\ntoday", subline: "No account needed" },
    ] } } });
  const d = api.getDeck("iphone");
  const dev = (i) => d.slides[i].layers.filter((l) => l.type === "device");
  const head = (i) => d.slides[i].layers.find((l) => l.name === "Headline");
  // angles and positions
  api.updateLayer("iphone", 0, dev(0)[0].id, { rotation: -9, x: dev(0)[0].x - 60, y: dev(0)[0].y + 40 });
  api.updateLayer("iphone", 1, dev(1)[0].id, { rotation: 9, x: dev(1)[0].x - 330, y: dev(1)[0].y + 60 });
  api.updateLayer("iphone", 2, dev(2)[0].id, { rotation: -6, x: dev(2)[0].x + 120, y: dev(2)[0].y + 120 });
  api.updateLayer("iphone", 3, dev(3)[0].id, { rotation: 14, x: dev(3)[0].x + 80 });
  api.updateLayer("iphone", 3, dev(3)[1].id, { rotation: -10, x: dev(3)[1].x - 60, y: dev(3)[1].y + 80 });
  // text effects: pill highlight, glow
  api.updateLayer("iphone", 2, head(2).id, { highlightStyle: "pill", highlight: "#5eead4", fill: { type: "solid", color: "#f0fdfa" } });
  api.updateLayer("iphone", 0, head(0).id, { shadow: { color: "rgba(94,234,212,0.55)", blur: 60, x: 0, y: 0 } });
  api.updateLayer("iphone", 4, head(4).id, { fill: { type: "linear", angle: 90, stops: [{ offset: 0, color: "#5eead4" }, { offset: 1, color: "#a78bfa" }] }, highlight: "#ffffff" });
  // decor: soft glowing blob and a star
  api.addLayer("iphone", 1, { type: "shape", shape: "blob", name: "Glow", x: 600, y: 1700, w: 900, h: 900, opacity: 0.35, blur: 40, fill: { type: "radial", cx: 0.5, cy: 0.5, r: 0.6, stops: [{ offset: 0, color: "#5eead4" }, { offset: 1, color: "#0a2236" }] } });
  api.addLayer("iphone", 4, { type: "shape", shape: "star", name: "Star", x: 980, y: 380, w: 180, h: 180, rotation: 14, fill: { type: "solid", color: "#5eead4" }, shadow: { color: "rgba(94,234,212,0.8)", blur: 50, x: 0, y: 0 } });
  api.setDevice("iphone");
}, ids);
for (let i = 0; i < 5; i++) save(`show-${i}`, await page.evaluate((i) => window.screenshotGuru.renderSlide("iphone", i, { width: 600 }), i));
const strip = await page.evaluate(async () => {
  // seamless strip: render each slide at the same width; neighbours bleed in, so edges line up
  const out = [];
  for (let i = 0; i < 5; i++) out.push(await window.screenshotGuru.renderSlide("iphone", i, { width: 500 }));
  return out;
});
strip.forEach((u, i) => save(`strip-${i}`, u));

// 3) editor screenshot with a tilted device selected
await page.evaluate(() => {
  const d = window.screenshotGuru.getDeck("iphone");
  const dev = d.slides[1].layers.find((l) => l.type === "device");
  window.screenshotGuru.select(1, dev.id);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/editor.png` });

// 4) every format: phone, watch, Wear OS, feature graphic, event card
const formats = await page.evaluate(async (ids) => {
  const api = window.screenshotGuru;
  api.addDeck("android-phone", "vivid-gradient", { slides: [{ headline: "Build habits\nthat **stick**", screenshot: ids.today }, { headline: "x", screenshot: ids.stats }] });
  api.addDeck("apple-watch", "midnight-glow", { slides: [{ headline: "**72%** today", screenshot: ids.watch }] });
  api.addDeck("wear-os", "midnight-glow", { slides: [{ screenshot: ids.wear }] });
  api.addDeck("feature-graphic", "midnight-glow", { slides: [{ headline: "Habits that **stick**", subline: "Track, plan, focus.", screenshot: ids.today }] });
  api.addDeck("event-card", "aurora-glass", { slides: [{ layout: "side", label: "THIS WEEK", headline: "30-day **streak**\nchallenge", screenshot: ids.stats }] });
  return {
    phone: await api.renderSlide("android-phone", 0, { width: 540 }),
    watch: await api.renderSlide("apple-watch", 0, { width: 422 }),
    wear: await api.renderSlide("wear-os", 0, { width: 540 }),
    feature: await api.renderSlide("feature-graphic", 0, { width: 1024 }),
    event: await api.renderSlide("event-card", 0, { width: 1024 }),
  };
}, ids);
for (const [k, v] of Object.entries(formats)) save(`fmt-${k}`, v);

// 5) Add AI skill dialog
await page.evaluate(() => window.screenshotGuru.setDevice("iphone"));
await page.getByRole("button", { name: "Add AI skill" }).click();
await page.getByRole("button", { name: "Claude Code" }).click();
await page.waitForTimeout(300);
await page.locator(".dialog").screenshot({ path: `${OUT}/skill-dialog.png` });
await page.keyboard.press("Escape");
await page.locator("button[aria-label=Close]").click().catch(() => {});

await browser.close();
console.log("captured", fs.readdirSync(OUT).length, "files");
