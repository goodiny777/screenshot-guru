import { expect, test } from "@playwright/test";

const PROD_LIKE = "http://localhost:4174";

test("production headers do not block the app (CSP)", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  page.on("pageerror", (e) => violations.push(e.message));
  const res = await page.goto(PROD_LIKE + "/");
  expect(res?.headers()["content-security-policy"]).toContain("default-src 'self'");
  await page.waitForFunction(() => (window as unknown as { screenshotGuru?: unknown }).screenshotGuru);

  // Exercise the paths CSP could break: blob/data images (import), canvas export.
  const r = await page.evaluate(async () => {
    const api = (window as unknown as { screenshotGuru: { addAsset(id: string, src: string): Promise<string>; renderSlide(d: string, i: number, o: object): Promise<string> } }).screenshotGuru;
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    await api.addAsset("csp-probe", c.toDataURL("image/png"));
    const url = await api.renderSlide("iphone", 0, { width: 200 });
    return url.slice(0, 22);
  });
  expect(r).toBe("data:image/png;base64,");
  expect(violations).toEqual([]);
});

test("negative control: a CSP violation would be caught", async ({ page }) => {
  // Proves the listener above can see violations: inline script is blocked by our CSP.
  const seen: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) seen.push(m.text()); });
  await page.goto(PROD_LIKE + "/");
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "window.__inline = 1";
    document.body.appendChild(s);
  });
  await page.waitForTimeout(300);
  expect(seen.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { __inline?: number }).__inline)).toBeUndefined();
});

test("skill zip is served with the skill folder at the top", async ({ request }) => {
  const res = await request.get(PROD_LIKE + "/screenshot-guru-skill.zip");
  expect(res.status()).toBe(200);
  const body = await res.body();
  expect(body.subarray(0, 2).toString()).toBe("PK");
  expect(body.includes(Buffer.from("screenshot-guru/SKILL.md"))).toBe(true);
});

test("project schema is served and packed into the skill", async ({ request }) => {
  const res = await request.get(PROD_LIKE + "/project.schema.json");
  expect(res.status()).toBe(200);
  const schema = await res.json();
  expect(schema.$id).toBe("https://screenshot-guru-11436.web.app/project.schema.json");
  expect(schema.properties.decks.propertyNames.enum).toContain("wear-os");
  const zip = await (await request.get(PROD_LIKE + "/screenshot-guru-skill.zip")).body();
  expect(zip.includes(Buffer.from("screenshot-guru/assets/project.schema.json"))).toBe(true);
});
