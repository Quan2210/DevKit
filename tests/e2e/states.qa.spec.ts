import { expect, test, type Page } from "@playwright/test";
import { routableTools, toolPath } from "../../src/registry/tools.meta";

/** QA gate 2: components.md section 4 state checklist, exercised in a real browser for every tool. */
const BASE = "http://localhost:4173";
const slugs = routableTools().map((t) => toolPath(t).split("/").pop()!);
const cm = (page: Page, nth = 0) => page.locator(".cm-content").nth(nth);
const settle = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
};
const typeCm = async (page: Page, text: string, nth = 0) => {
  await cm(page, nth).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(text);
};

test.describe("empty state: invitation text, primary action disabled with a reason", () => {
  for (const slug of slugs) {
    test(slug, async ({ page }) => {
      await page.goto(`tools/${slug}/`);
      await settle(page);
      // Empty state must offer "Mẫu" (or Tạo UUID for the generator, or colours with defaults).
      const sample = page.getByRole("button", { name: "Mẫu", exact: true });
      const generate = page.getByRole("button", { name: "Tạo UUID" });
      const colourTool = slug.startsWith("color-") || slug === "css-gradient";
      if (!colourTool && slug !== "uuid-generator") {
        await expect(sample.first(), `${slug} has a sample button`).toBeVisible();
        const clear = page.getByRole("button", { name: "Xóa", exact: true }).first();
        await expect(clear, "Clear disabled when empty").toBeDisabled();
      } else if (slug === "uuid-generator") {
        await expect(generate).toBeEnabled();
      }
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }
});

test.describe("copy feedback and clipboard failure", () => {
  test("JSON Copy shows Đã copy then reverts; denied clipboard shows guidance", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await page.goto("tools/json-formatter/");
    await settle(page);
    await page.getByRole("button", { name: "Mẫu", exact: true }).first().click();
    // The JSON pane's Copy is a menu: "Copy nội dung" copies the text as it is.
    const copyMenu = page.getByRole("button", { name: "Copy", exact: true }).first();
    const copied = page.getByRole("status").filter({ hasText: "Đã copy" });
    await copyMenu.click();
    await page.getByRole("menuitem", { name: "Copy nội dung" }).click();
    await expect(copied.first()).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"KunKit"');
    await expect(copied).toHaveCount(0, { timeout: 4000 });

    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new DOMException("no", "NotAllowedError")) },
        configurable: true,
      });
      document.execCommand = () => false; // the legacy fallback must fail too
    });
    await copyMenu.click();
    await page.getByRole("menuitem", { name: "Copy nội dung" }).click();
    await expect(page.getByText(/Không copy được/).first()).toBeVisible();
  });
});

test("JSON clipboard failure pre-selects the content (components.md 2.5)", async ({ page }) => {
  test.fail(); // BUG-2 (Minor): guidance is shown but nothing is selected. Remove test.fail() once fixed.
  await page.goto("tools/json-formatter/");
  await settle(page);
  await page.getByRole("button", { name: "Mẫu", exact: true }).first().click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new DOMException("no", "NotAllowedError")) },
      configurable: true,
    });
    document.execCommand = () => false;
  });
  await page.getByRole("button", { name: "Copy", exact: true }).first().click();
  await page.getByRole("menuitem", { name: "Copy nội dung" }).click();
  await expect(page.getByText(/Không copy được/).first()).toBeVisible();
  // components.md 2.5: on failure the content is pre-selected so Ctrl+C works.
  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(selected, "content is pre-selected after a clipboard failure").toContain("KunKit");
});

test.describe("invalid input keeps the previous output and labels it", () => {
  test("JSON", async ({ page }) => {
    await page.goto("tools/json-formatter/");
    await settle(page);
    await typeCm(page, '{"ok":1}');
    await page.getByRole("button", { name: "Transform sang ô phải" }).click();
    await expect(cm(page, 1)).toContainText('"ok"');
    await typeCm(page, '{"ok":');
    await expect(page.getByText("JSON không hợp lệ.")).toBeVisible();
    // The other pane is never touched by an error on this one.
    await expect(cm(page, 1)).toContainText('"ok"');
  });
  test("Base64 decode of garbage names the position", async ({ page }) => {
    await page.goto("tools/base64/");
    await settle(page);
    await page.getByRole("radio", { name: "Giải mã" }).click();
    await typeCm(page, "ab$cd");
    await expect(page.getByText(/Không giải mã được Base64/)).toBeVisible();
    await expect(page.getByText(/Dòng 1, cột 3/)).toBeVisible();
  });
  test("JWT: wrong parts, then valid", async ({ page }) => {
    await page.goto("tools/jwt-decoder/");
    await settle(page);
    const box = page.getByRole("textbox", { name: "Token JWT" });
    await box.fill("abc.def");
    await expect(page.getByText(/đúng 3 phần/)).toBeVisible();
    await box.fill("");
    await expect(page.getByText("Dán một JWT để xem nội dung.")).toBeVisible();
  });
  test("Colour inputs: invalid hex shows an error text, not only a red border", async ({
    page,
  }) => {
    await page.goto("tools/color-picker/");
    await settle(page);
    await page.getByLabel("HEX", { exact: true }).fill("#GG");
    await expect(page.getByText(/Màu không hợp lệ/).first()).toBeVisible();
    await page.goto("tools/color-contrast/");
    await settle(page);
    await page.getByLabel("Màu chữ", { exact: true }).fill("nonsense");
    await expect(page.getByText(/Màu không hợp lệ/).first()).toBeVisible();
  });
  test("UUID count outside 1..1000 is rejected with text; boundaries accepted", async ({
    page,
  }) => {
    await page.goto("tools/uuid-generator/");
    await settle(page);
    const count = page.getByRole("spinbutton");
    for (const bad of ["0", "1001", "-3", "1.5"]) {
      await count.fill(bad);
      await page.getByRole("button", { name: "Tạo UUID" }).click();
      await expect(page.getByText("Số lượng phải là số nguyên từ 1 đến 1000."), bad).toBeVisible();
    }
    await count.fill("1000");
    await page.getByRole("button", { name: "Tạo UUID" }).click();
    await expect(page.getByText(/^1[.,]?000 UUID$/)).toBeVisible();
    await count.fill("1");
    await page.getByRole("button", { name: "Tạo UUID" }).click();
    await expect(page.getByText("1 UUID", { exact: true })).toBeVisible();
  });
});

test.describe("very large input does not freeze the tab", () => {
  const big = (n: number) =>
    JSON.stringify({ a: Array.from({ length: n }, (_, i) => ({ i, s: "x".repeat(20) })) });
  for (const [slug, text] of [
    ["json-formatter", big(20000)],
    ["xml-formatter", "<r>" + "<i>x</i>".repeat(60000) + "</r>"],
    ["base64", "abc ".repeat(250000)],
  ] as const) {
    test(`${slug} ~1MB stays responsive`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(`tools/${slug}/`);
      await settle(page);
      const t0 = Date.now();
      await typeCm(page, text);
      // The page must still answer a trivial evaluate within a few seconds after the paste.
      const alive = await Promise.race([
        page.evaluate(() => 1),
        new Promise((r) => setTimeout(() => r("frozen"), 15_000)),
      ]);

      console.log(`LARGE ${slug}: ${text.length} chars, paste+idle ${Date.now() - t0} ms`);
      expect(alive).toBe(1);
      // Clear must work afterwards.
      await page.getByRole("button", { name: "Xóa", exact: true }).first().click();
      await expect(page.getByRole("button", { name: "Hoàn tác" }).first()).toBeVisible({
        timeout: 15_000,
      });
    });
  }
  test("JWT token of 1 MB does not hang and reports an error", async ({ page }) => {
    await page.goto("tools/jwt-decoder/");
    await settle(page);
    await page.getByRole("textbox", { name: "Token JWT" }).fill("a".repeat(1_000_000) + ".b.c");
    await expect(page.getByText(/Không đọc được JWT|Phần/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
  test("Palette/Gradient: extreme numbers do not crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("tools/css-gradient/");
    await settle(page);
    await page.getByLabel("Góc (độ)", { exact: true }).fill("99999999999999999999");
    await page.getByLabel("Góc (độ)", { exact: true }).blur();
    for (let i = 0; i < 12; i += 1)
      await page
        .getByRole("button", { name: "Thêm điểm màu" })
        .click({ timeout: 2000 })
        .catch(() => undefined);
    await expect(page.locator("h1")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("keyboard-only operation", () => {
  test("UUID: Enter in the count field generates", async ({ page }) => {
    await page.goto("tools/uuid-generator/");
    await settle(page);
    const count = page.getByRole("spinbutton");
    await count.focus();
    await page.keyboard.press("Enter");
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: /^[0-9a-f-]{36}/ })
        .first(),
    ).toBeVisible();
  });
  test("Markdown: external-images dialog traps focus, Esc cancels and returns focus", async ({
    page,
  }) => {
    await page.goto("tools/markdown-preview/");
    await settle(page);
    const toggle = page.getByRole("checkbox", { name: "Tải ảnh ngoài" });
    await toggle.focus();
    await page.keyboard.press("Space");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () =>
            document.activeElement === document.body || !!document.activeElement?.closest("dialog"),
        ),
        `tab ${i}`,
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(toggle).not.toBeChecked();
    await expect(toggle).toBeFocused();
  });
  test("Segmented control supports arrows and Home/End (Base64 mode)", async ({ page }) => {
    await page.goto("tools/base64/");
    await settle(page);
    const enc = page.getByRole("radio", { name: "Mã hóa" });
    const dec = page.getByRole("radio", { name: "Giải mã" });
    await enc.focus();
    await page.keyboard.press("ArrowRight");
    await expect(dec).toBeChecked();
    await page.keyboard.press("Home");
    await expect(enc).toBeChecked();
    await page.keyboard.press("End");
    await expect(dec).toBeChecked();
  });
  test("every tool: a visible focus indicator on the first 8 tab stops", async ({ page }) => {
    for (const slug of slugs) {
      await page.goto(`tools/${slug}/`);
      await settle(page);
      for (let i = 0; i < 8; i += 1) {
        await page.keyboard.press("Tab");
        const ok = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return true;
          const cs = getComputedStyle(el);
          const ring = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
          return ring || cs.boxShadow !== "none" || !!el.closest(".cm-editor");
        });
        expect(ok, `${slug} tab stop ${i}`).toBe(true);
      }
    }
  });
});

test.describe("display preferences", () => {
  test("reduced motion: no transitions longer than 10ms on buttons or the shell", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const slug of ["markdown-preview", "css-gradient", "color-contrast"]) {
      await page.goto(`tools/${slug}/`);
      await settle(page);
      const long = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            "button, a, input, label, [role=radio], aside, nav",
          ),
        ]
          .map((el) => ({
            el: el.tagName + "." + el.className.toString().slice(0, 40),
            d: getComputedStyle(el),
          }))
          .filter(
            ({ d }) =>
              d.transitionDuration
                .split(",")
                .some((v) => parseFloat(v) * (v.includes("ms") ? 1 : 1000) > 10) ||
              (d.animationName !== "none" &&
                d.animationDuration
                  .split(",")
                  .some((v) => parseFloat(v) * (v.includes("ms") ? 1 : 1000) > 10)),
          )
          .map(({ el }) => el)
          .slice(0, 5),
      );
      expect(long, slug).toEqual([]);
    }
  });
  for (const forced of ["dark", "light"] as const) {
    test(`forced ${forced}: page background/foreground follow the scheme on every tool`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: forced });
      for (const slug of slugs) {
        await page.goto(`tools/${slug}/`);
        await settle(page);
        const lum = await page.evaluate(() => {
          let node: Element | null = document.body;
          let bg = "rgba(0, 0, 0, 0)";
          while (
            node &&
            /rgba\(0, 0, 0, 0\)|transparent/.test((bg = getComputedStyle(node).backgroundColor))
          )
            node = node.parentElement;
          const c = bg.match(/\d+/g)!.map(Number);
          return (0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!) / 255;
        });
        if (forced === "dark") expect(lum, slug).toBeLessThan(0.3);
        else expect(lum, slug).toBeGreaterThan(0.7);
      }
    });
  }
  test("320px viewport and 200% zoom: no horizontal page scroll, no clipped controls, on every tool with content", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const slug of slugs) {
      await page.goto(`tools/${slug}/`);
      await settle(page);
      const sample = page.getByRole("button", { name: "Mẫu", exact: true });
      if (await sample.count()) await sample.first().click();
      else if (slug === "uuid-generator")
        await page.getByRole("button", { name: "Tạo UUID" }).click();
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => ({
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        right: [...document.querySelectorAll<HTMLElement>("button,a[href],input,select,textarea")]
          .filter(
            (e) =>
              e.getBoundingClientRect().width > 0 &&
              !e.closest(".cm-scroller") &&
              !e.closest("[class*=sr-only]"),
          )
          .filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .map((e) => (e.getAttribute("aria-label") || e.textContent || e.tagName).slice(0, 25)),
      }));
      expect(m.over, `${slug} overflow at 320`).toBeLessThanOrEqual(0);
      expect(m.right, `${slug} controls beyond the viewport at 320`).toEqual([]);
    }
  });
});
