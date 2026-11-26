# Driving the editor in a browser: window.screenshotGuru

Use this when you can control a browser (Claude in Chrome, Antigravity's browser agent, Playwright,
Puppeteer and similar). Open https://screenshot-guru-11436.web.app and wait until `window.screenshotGuru` exists.
Everything runs in the page; the user sees the changes live and can keep editing after you.

Run JavaScript in the page and `await` the async methods. `screenshotGuru.help()` lists every method.

## Load a project

```js
// Recipe or full project JSON (see project-format.md). Image fields must be asset ids or URLs
// already added with addAsset, because the browser cannot read the user's disk.
const home = await screenshotGuru.addAsset("home", "data:image/png;base64,iVBOR...");
await screenshotGuru.loadProject({
  schema: "screenshot-guru/1", name: "Habitly", locales: ["en"],
  decks: { iphone: { template: "midnight-glow", slides: [
    { headline: "Build habits\nthat **stick**", screenshot: home }
  ] } }
});
```

Or load a packed zip directly (base64 string, data URL, or an http(s) URL the page can fetch):

```js
await screenshotGuru.loadProjectZip("<base64 of the zip from pack_project.py>");
```

If you cannot pass large strings into the page, ask the user to drop the zip onto the page instead,
or use the page's **Open** button with your browser tool's file-upload action.

## Edit

```js
screenshotGuru.listDevices();                 // ids, sizes, rules
screenshotGuru.listTemplates();               // 12 templates
screenshotGuru.addDeck("ipad", "midnight-glow", { slides: [...] });  // build another device from a recipe
screenshotGuru.restyle("iphone", "paper-japandi");                   // new look, same layout and copy
screenshotGuru.setText("iphone", 0, "Headline", "Build habits\nthat **last**", "en");
screenshotGuru.setScreenshot("iphone", 1, home);                     // first device layer on slide 2
screenshotGuru.getDeck("iphone");             // full JSON with layer ids, for precise edits
screenshotGuru.updateLayer("iphone", 0, "<layerId>", { y: 900, rotation: -4 });
screenshotGuru.addSlide("iphone", { layout: "claim", headline: "Start **free**" });
screenshotGuru.setLocale("de");               // switch the editor's language
screenshotGuru.setDevice("feature-graphic");  // show another deck
```

## Check your work

```js
screenshotGuru.validate();   // [{device, slide, level: "error"|"warn"|"tip", message}]
const png = await screenshotGuru.renderSlide("iphone", 0, { width: 600, locale: "en" }); // data URL
```

Look at the rendered images (or take a screenshot of the page) before you finish. Fix overlapping
text, cut-off words, low contrast and empty devices. Then fix every `error` from `validate()`.

## Export

```js
await screenshotGuru.exportZip();  // downloads <App>-store-assets.zip with every size, locale and deck
await screenshotGuru.exportZip({ devices: ["iphone", "android-phone"], locales: ["en"], format: "png" });
await screenshotGuru.saveProjectZip(); // downloads the editable project (to reopen later)
```

The export is organised as `app-store|google-play|promo/<device>/<WxH>/<locale>/01.png`.
Tell the user where the download went and which store slot each folder belongs to.
