import { expect, test, type Page } from "@playwright/test";

import { ORIGIN } from "./env";

const BASE = ORIGIN;

/** Requests that leave the origin; the product promise is that this stays empty by default. */
function externalRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(BASE) && !url.startsWith("data:") && !url.startsWith("blob:"))
      urls.push(url);
  });
  return urls;
}

const ready = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.locator(".cm-content").first().waitFor();
};

const type = async (page: Page, text: string) => {
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(text);
};

test.describe("Markdown Preview in a real browser", () => {
  test("renders in a worker under the CSP and never runs or fetches anything unsafe", async ({
    page,
  }) => {
    const external = externalRequests(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) => {
      errors.push(`dialog: ${dialog.message()}`);
      void dialog.dismiss();
    });
    await page.goto("tools/markdown-preview/");
    await ready(page);
    await page.getByRole("radio", { name: "Xem" }).click();
    await page.getByRole("radio", { name: "Soạn" }).click();

    const payload = [
      "# Title",
      "",
      "<script>window.__pwned = 1</script>",
      '<img src=x onerror="window.__pwned = 2">',
      "[click](javascript:window.__pwned=3)",
      "![remote](https://evil.example/a.png)",
      "![](//evil.example/b.png)",
      "",
      "- [ ] task",
      "",
      "Footnote[^1]",
      "",
      "[^1]: note",
      "",
      "text ".repeat(2500),
    ].join("\n");
    await type(page, payload);
    await page.getByRole("radio", { name: "Xem" }).click();

    await expect(page.locator("#md-title")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Footnote")).toBeVisible({ timeout: 30_000 });
    expect(
      await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
    ).toBeUndefined();
    await expect(page.locator("[class*=md-prose] script, [class*=md-prose] iframe")).toHaveCount(0);
    await expect(page.locator("a[href^='javascript']")).toHaveCount(0);
    await expect(page.locator("img[src*='evil']")).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: "task" })).toBeDisabled();
    const worker = await page.evaluate(() =>
      performance.getEntriesByType("resource").some((entry) => /markdown\.worker/.test(entry.name)),
    );
    expect(worker).toBe(true);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("footnote links point at ids that exist", async ({ page }) => {
    await page.goto("tools/markdown-preview/");
    await ready(page);
    await type(page, "Hello[^1]\n\n[^1]: the note\n");
    await page.getByRole("radio", { name: "Xem" }).click();
    const href = await page
      .locator("a[href^='#user-content-fn']")
      .first()
      .getAttribute("href", { timeout: 15_000 });
    expect(href).toBeTruthy();
    await expect(page.locator(`[id='${href!.slice(1)}']`)).toHaveCount(1);
  });

  test("opening a file and dropping a file each insert the content once", async ({ page }) => {
    await page.goto("tools/markdown-preview/");
    await ready(page);
    await page.locator("input[type=file]").setInputFiles({
      name: "a.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# From file\n"),
    });
    await expect(page.locator(".cm-content").first()).toContainText("# From file");
    expect(
      (await page.locator(".cm-content").first().innerText()).match(/From file/g),
    ).toHaveLength(1);

    await page.getByRole("button", { name: "Xóa" }).click();
    // A real drop onto the editor area (the CodeMirror drop handler must not insert it a second time).
    const editor = page.locator(".cm-editor").first();
    const box = (await editor.boundingBox())!;
    const dataTransfer = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["# Dropped\n"], "d.md", { type: "text/markdown" }));
      return transfer;
    });
    const at = { clientX: box.x + 40, clientY: box.y + 40, bubbles: true, cancelable: true };
    await editor.dispatchEvent("dragenter", { dataTransfer, ...at });
    await editor.dispatchEvent("dragover", { dataTransfer, ...at });
    const overlay = page.getByTestId("md-drop-overlay");
    await expect(overlay).toBeVisible();
    await overlay.dispatchEvent("drop", { dataTransfer, ...at });
    await expect(page.locator(".cm-content").first()).toContainText("# Dropped");
    // Give a second (duplicate) insertion time to show up before counting.
    await page.waitForTimeout(500);
    const text = await page.locator(".cm-content").first().innerText();
    expect(text.match(/Dropped/g) ?? []).toHaveLength(1);
  });
});

test.describe("other tools in a real browser", () => {
  test("XML: invalid input shows the engine's line and column and disables download", async ({
    page,
  }) => {
    await page.goto("tools/xml-formatter/");
    await ready(page);
    await type(page, "<a>\n<b>\n</a>");
    await expect(page.getByText("XML không hợp lệ.")).toBeVisible();
    await expect(page.getByText(/Dòng \d+, cột \d+/)).toBeVisible();
  });

  test("XML: valid input formats and keeps mixed content", async ({ page }) => {
    await page.goto("tools/xml-formatter/");
    await ready(page);
    await type(page, "<r><p>Hi <b>x</b> !</p><q><z/></q></r>");
    await page.getByRole("button", { name: "Format sang ô phải" }).click();
    await expect(page.locator(".cm-content").nth(1)).toContainText("<p>Hi <b>x</b> !</p>");
    await expect(page.getByText("Hợp lệ", { exact: true }).first()).toBeVisible();
  });

  test("JSON: formats and reports an error position", async ({ page }) => {
    await page.goto("tools/json-formatter/");
    await ready(page);
    await type(page, '{"a":[1,2]}');
    await page.getByRole("button", { name: "Transform sang ô phải" }).click();
    await expect(page.locator(".cm-content").nth(1)).toContainText('"a"');
    await type(page, '{"a": }');
    await expect(page.getByText(/Dòng \d+, cột \d+/)).toBeVisible();
  });

  test("Base64: encodes UTF-8 text", async ({ page }) => {
    await page.goto("tools/base64/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.locator(".cm-content").first().click();
    await page.keyboard.insertText("Xin chào");
    await expect(page.locator(".cm-content").nth(1)).toContainText("WGluIGNow6Bv");
  });

  test("UUID: generates the requested count with Web Crypto", async ({ page }) => {
    await page.goto("tools/uuid-generator/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("spinbutton").fill("25");
    await page.getByRole("button", { name: "Tạo UUID" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: /^[0-9a-f-]{36}/ })).toHaveCount(25);
  });

  test("Color Contrast: known values in the browser", async ({ page }) => {
    await page.goto("tools/color-contrast/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.getByLabel("Màu chữ", { exact: true }).fill("#000000");
    await page.getByLabel("Màu nền", { exact: true }).fill("#FFFFFF");
    await expect(page.getByTestId("ratio")).toHaveText("21.00 : 1");
    await page.getByLabel("Màu chữ", { exact: true }).fill("#777777");
    await expect(page.getByTestId("ratio")).toHaveText("4.47 : 1");
  });

  test("Color Picker: recent colors survive a reload", async ({ page }) => {
    await page.goto("tools/color-picker/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.getByLabel("HEX", { exact: true }).fill("#00AA55");
    await expect(page.getByRole("button", { name: "Dùng màu #00AA55" })).toBeVisible({
      timeout: 5000,
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Dùng màu #00AA55" })).toBeVisible();
  });

  test("the app still works when localStorage is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("tools/color-picker/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("HEX", { exact: true })).toBeVisible();
    await expect(page.getByText(/không cho lưu lịch sử màu/)).toBeVisible();
    expect(errors).toEqual([]);
  });
});
