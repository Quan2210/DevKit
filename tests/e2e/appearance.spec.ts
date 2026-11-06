import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  DEFAULT_APPEARANCE,
  resolveAppearance,
  toStored,
  type Appearance,
} from "../../src/lib/appearance";

import { ORIGIN } from "./env";

const KEY = "devkit:v1:appearance";

/** Saves an appearance the way the app does, before any page script runs. */
async function seed(page: Page, appearance: Appearance) {
  const stored = toStored(appearance, resolveAppearance(appearance)!);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key!, value!),
    [KEY, JSON.stringify(stored)],
  );
}

const ready = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.locator(".cm-content").first().waitFor();
};

const colourOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);

test.describe("custom frame colours in a real browser", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("choose a colour in the menu: it applies at once, survives a reload and can be reset", async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith(ORIGIN) && !request.url().startsWith("data:")) {
        external.push(request.url());
      }
    });
    await page.goto("tools/json-formatter/");
    await ready(page);
    const before = await colourOf(page, "main");

    await page.getByRole("button", { name: "Tùy chỉnh màu giao diện" }).click();
    await page.getByRole("radio", { name: "Teal" }).check({ force: true });
    await expect(page.getByText("Độ tương phản đạt chuẩn AA")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-ap-nav", "");
    const header = await colourOf(page, "section header");
    expect(header).not.toBe("rgb(255, 255, 255)");

    await page.reload();
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("data-ap-nav", "");
    expect(await colourOf(page, "section header")).toBe(header);

    await page.getByRole("button", { name: "Tùy chỉnh màu giao diện" }).click();
    await page.getByRole("button", { name: "Đặt lại về mặc định" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-ap-nav", "");
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
    expect(await colourOf(page, "main")).toBe(before);
    expect(external).toEqual([]);
  });

  test("the saved colour is already on the first paint (no flash of the default look)", async ({
    page,
  }) => {
    await seed(page, { ...DEFAULT_APPEARANCE, base: "#0d9488" });
    const paints: string[] = [];
    await page.exposeFunction("record", (value: string) => paints.push(value));
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        void (window as unknown as { record: (v: string) => void }).record(
          getComputedStyle(document.documentElement).backgroundColor,
        );
      });
    });
    await page.goto("tools/json-formatter/");
    await ready(page);
    expect(paints).toHaveLength(1);
    // The default page colour is #f8fafc (light) or #0b1120 (dark); a tinted one is neither.
    expect(["rgb(248, 250, 252)", "rgb(11, 17, 32)"]).not.toContain(paints[0]);
  });

  test("a hostile stored value is ignored", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          base: "#0d9488",
          regions: { page: true, nav: true, panel: true, status: true },
          navStyle: "tint",
          vars: { "--evil": "#000000", "--ap-page-l": "red; background: url(//evil)" },
          attrs: ["onclick"],
        }),
      );
    }, KEY);
    await page.goto("tools/json-formatter/");
    await ready(page);
    const names = await page.evaluate(() => document.documentElement.getAttributeNames());
    expect(names.filter((name) => name.startsWith("data-ap-"))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.style.cssText)).not.toContain("evil");
  });

  const configs: Array<[string, Appearance]> = [
    ["teal tint", { ...DEFAULT_APPEARANCE, base: "#0d9488" }],
    ["teal solid navigation", { ...DEFAULT_APPEARANCE, base: "#0d9488", navStyle: "solid" }],
    ["bright yellow tint", { ...DEFAULT_APPEARANCE, base: "#ffff00" }],
    [
      "bright yellow solid navigation",
      { ...DEFAULT_APPEARANCE, base: "#ffff00", navStyle: "solid" },
    ],
    ["pink tint", { ...DEFAULT_APPEARANCE, base: "#db2777" }],
  ];
  for (const [name, appearance] of configs) {
    for (const scheme of ["light", "dark"] as const) {
      test(`no WCAG A/AA violations: ${name} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await seed(page, appearance);
        await page.goto("tools/json-formatter/");
        await ready(page);
        await page.getByRole("button", { name: "Mẫu", exact: true }).first().click();
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
  }

  test("the menu itself passes axe with a dark navigation", async ({ page }) => {
    await seed(page, { ...DEFAULT_APPEARANCE, base: "#0d9488", navStyle: "solid" });
    await page.goto("tools/json-formatter/");
    await ready(page);
    await page.getByRole("button", { name: "Tùy chỉnh màu giao diện" }).click();
    await expect(page.getByRole("group", { name: "Màu giao diện" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map(
        (v) =>
          `${v.id}: ${v.nodes.map((n) => n.target.join(" ") + " " + (n.any[0]?.message ?? "")).join(" | ")}`,
      ),
    ).toEqual([]);
    // The panel keeps the normal palette even inside the dark navigation.
    expect(await colourOf(page, '[role="group"][aria-label="Màu giao diện"]')).toBe(
      "rgb(255, 255, 255)",
    );
  });

  test("the compare result keeps its colours readable with a custom page colour", async ({
    page,
  }) => {
    await seed(page, { ...DEFAULT_APPEARANCE, base: "#2563eb" });
    await page.goto("tools/text-compare/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Mẫu", exact: true }).click();
    await page.getByRole("button", { name: "So sánh" }).click();
    await page.getByRole("status", { name: "Tóm tắt khác biệt" }).waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("on a narrow screen", () => {
  test("the menu is a dialog, fits the screen and does not scroll the page sideways", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("tools/json-formatter/");
    await ready(page);
    await page.getByRole("button", { name: "Tùy chỉnh màu giao diện" }).click();
    await expect(page.getByRole("dialog", { name: "Màu giao diện" })).toBeVisible();
    await page.getByRole("radio", { name: "Tím" }).check({ force: true });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Màu giao diện" })).toBeHidden();
  });
});
