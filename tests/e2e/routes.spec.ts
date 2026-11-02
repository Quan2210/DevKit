import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { routableTools, toolPath } from "../../src/registry/tools.meta";

import { ORIGIN } from "./env";
import { DEFAULT_LOCALE, translate } from "../../src/i18n";

const BASE = ORIGIN;
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

test("an unknown URL is a real 404 with the not-found page and a clean console", async ({
  page,
}) => {
  const problems = watch(page);
  const response = await page.goto("tools/does-not-exist/");
  await settle(page);
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(translate(DEFAULT_LOCALE, "notFound.title"));
  // The 404 status itself is reported by the browser as a failed resource; nothing else may be.
  expect(problems.filter((problem) => !/status of 404/.test(problem))).toEqual([]);
});

test("the theme choice survives a reload and is set when the document loads", async ({ page }) => {
  await page.goto("");
  await settle(page);
  await page.getByRole("radio", { name: /tối/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
