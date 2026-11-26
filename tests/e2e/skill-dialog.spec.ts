import { expect, test } from "@playwright/test";
import { openApp } from "./helpers/app";

const LIVE = "https://screenshot-guru-11436.web.app";

test("Add AI skill: commands copied from a local copy point to the live site", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Add AI skill" }).click();
  for (const tab of ["Claude Code", "Antigravity", "GitHub Copilot", "Cursor"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    const code = (await page.locator("pre.code").allInnerTexts()).join("\n");
    expect(code, tab).toContain(`${LIVE}/screenshot-guru-skill.zip`);
    expect(code, tab).not.toMatch(/localhost|127\.0\.0\.1/);
  }
  await expect(page.getByRole("link", { name: "Download skill ZIP" })).toHaveAttribute("href", `${LIVE}/screenshot-guru-skill.zip`);
});
