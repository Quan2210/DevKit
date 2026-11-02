import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { routableTools, toolPath } from "../../src/registry/tools.meta";

const BASE = "http://localhost:4173";
const pages = ["/", ...routableTools().map((tool) => toolPath(tool))];

/** Collects what must stay empty on every page: console errors, uncaught errors, requests off the origin. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("request", (request) => {
    if (
      !request.url().startsWith(BASE) &&
      !request.url().startsWith("data:") &&
      !request.url().startsWith("blob:")
    ) {
      problems.push(`external request: ${request.url()}`);
    }
  });
  return problems;
}

const settle = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // hydration and lazy editors
};

for (const path of pages) {
  const url = path === "/" ? "" : path.replace(/^\//, "");

  test.describe(`route ${path}`, () => {
    test("loads without errors or outside requests, with one H1", async ({ page }) => {
      const problems = watch(page);
      await page.goto(url);
      await settle(page);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(problems).toEqual([]);
    });

    for (const scheme of ["light", "dark"] as const) {
      test(`has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(url);
        await settle(page);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
          ),
        ).toEqual([]);
      });
    }

    for (const width of [375, 768, 1024, 1440]) {
      test(`does not scroll sideways at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        await settle(page);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
}

test("an unknown URL shows the not-found page, not a blank screen", async ({ page }) => {
  const response = await page.goto("tools/does-not-exist/");
  await settle(page);
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("the theme choice survives a reload and is applied before first paint", async ({ page }) => {
  await page.goto("");
  await settle(page);
  await page.getByRole("radio", { name: /tối/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
