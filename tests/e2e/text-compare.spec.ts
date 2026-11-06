import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ORIGIN } from "./env";

const URL = "tools/text-compare/";

/** What must stay empty: errors and any request that leaves the origin. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(ORIGIN) && !url.startsWith("data:") && !url.startsWith("blob:"))
      problems.push(`external request: ${url}`);
  });
  return problems;
}

const LEFT = "alpha\nbeta\ngamma\ndelta";
const RIGHT = "alpha\nbeta changed\ngamma\nnew line\ndelta";

const fill = async (page: Page, side: "Văn bản gốc" | "Văn bản đã sửa", text: string) => {
  await page.getByRole("textbox", { name: side }).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(text);
};

const open = async (page: Page, left = LEFT, right = RIGHT) => {
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Văn bản gốc" }).waitFor();
  await fill(page, "Văn bản gốc", left);
  await fill(page, "Văn bản đã sửa", right);
  await page.getByRole("button", { name: "So sánh" }).click();
  await page.getByRole("status", { name: "Tóm tắt khác biệt" }).waitFor();
};

test.describe("Text Compare in a real browser", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("compares two texts side by side, marks the lines and counts the differences", async ({
    page,
  }) => {
    const problems = watch(page);
    await open(page);
    const summary = page.getByRole("status", { name: "Tóm tắt khác biệt" });
    await expect(summary).toContainText("2 khác biệt");
    await expect(summary).toContainText("thêm 1 · xóa 0 · đổi 1");
    // Left side marks the changed line, right side the changed and the added one.
    await expect(page.locator(".cm-merge-a .cm-changedLine")).toHaveCount(1);
    await expect(page.locator(".cm-merge-b .cm-changedLine")).toHaveCount(2);
    // The characters that differ are marked inside the line.
    await expect(page.locator(".cm-merge-b .cm-changedText").first()).toContainText("changed");
    expect(problems).toEqual([]);
  });

  test("updates the differences while the result is edited", async ({ page }) => {
    await open(page);
    const summary = page.getByRole("status", { name: "Tóm tắt khác biệt" });
    await page.getByRole("textbox", { name: "Văn bản đã sửa" }).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText(LEFT);
    await expect(summary).toContainText("Hai văn bản giống nhau");
  });

  test("ignores case and whitespace on request", async ({ page }) => {
    await open(page, "Hello   World", "hello world");
    const summary = page.getByRole("status", { name: "Tóm tắt khác biệt" });
    await expect(summary).toContainText("1 khác biệt");
    await page.getByRole("checkbox", { name: "Bỏ qua khoảng trắng" }).check();
    await page.getByRole("checkbox", { name: "Bỏ qua hoa/thường" }).check();
    await expect(summary).toContainText("Hai văn bản giống nhau");
  });

  test("jumps between differences and goes back to the inputs with the text kept", async ({
    page,
  }) => {
    const long = Array.from({ length: 80 }, (_, i) => `line ${i}`);
    const changed = long.map((line, i) => (i === 70 ? "line 70 changed" : line));
    const changedText = changed.join("\n");
    await open(page, long.join("\n"), changedText);
    await page.getByRole("button", { name: "Khác biệt sau" }).click();
    await expect(page.locator(".cm-merge-b .cm-changedLine").first()).toBeInViewport();
    await page.getByRole("button", { name: "Nhập lại" }).click();
    await expect(
      page.getByText(`Văn bản đã sửa: ${changedText.length} ký tự`, { exact: true }),
    ).toBeVisible();
  });

  test("switches to one column without losing the text", async ({ page }) => {
    await open(page);
    await page.getByRole("radio", { name: "Một cột" }).click();
    await expect(page.locator(".cm-deletedChunk").first()).toContainText("beta");
    await expect(page.getByRole("status", { name: "Tóm tắt khác biệt" })).toContainText(
      "2 khác biệt",
    );
  });

  test("handles a large text with many differences without freezing", async ({ page }) => {
    const lines = Array.from({ length: 20000 }, (_, i) => `row ${i} lorem ipsum dolor`);
    const edited = lines.map((line, i) => (i % 400 === 0 ? `${line} X` : line));
    const started = Date.now();
    // Typing megabytes into an editor is slow in any browser, so the texts come in as files.
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    const texts = [lines.join("\n"), edited.join("\n")];
    for (const [index, text] of texts.entries()) {
      await page
        .locator('input[type="file"]')
        .nth(index)
        .setInputFiles({ name: "big.txt", mimeType: "text/plain", buffer: Buffer.from(text) });
    }
    await page.getByRole("button", { name: "So sánh" }).click();
    await expect(page.getByRole("status", { name: "Tóm tắt khác biệt" })).toContainText(
      "50 khác biệt",
      { timeout: 20_000 },
    );
    expect(Date.now() - started).toBeLessThan(30_000);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`the result has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      await page.getByRole("checkbox", { name: "Ẩn dòng giống nhau" }).check();
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
});

test.describe("Text Compare on small screens", () => {
  for (const width of [320, 375, 768]) {
    test(`does not scroll the page sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      // Narrow screens start in one column.
      await expect(page.getByRole("radio", { name: "Một cột" })).toBeChecked();
    });
  }
});
