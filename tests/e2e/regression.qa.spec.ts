import { expect, test, type Page } from "@playwright/test";
import { routableTools } from "../../src/registry/tools.meta";
import { DEFAULT_LOCALE, translate, type MessageKey } from "../../src/i18n";

/** QA gate 2: cross-tool regression (client-side navigation, history, theme, resize, leaks). */
const BASE = "http://localhost:4173";
const titles = routableTools().map((t) => translate(DEFAULT_LOCALE, t.titleKey as MessageKey));
const cm = (page: Page, nth = 0) => page.locator(".cm-content").nth(nth);
const settle = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
};
async function go(page: Page, title: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: title, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.waitForTimeout(250);
}

function problems(page: Page) {
  const list: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") list.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => list.push(`pageerror: ${e.message}`));
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(`${BASE}/`) && !u.startsWith("data:") && !u.startsWith("blob:"))
      list.push(`external: ${u}`);
  });
  return list;
}

test("client-side navigation through all tools 3 times: no errors, no listener/node/heap growth", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const list = problems(page);
  await page.goto("");
  await settle(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const metrics = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    const { metrics: m } = await cdp.send("Performance.getMetrics");
    const get = (n: string) => m.find((x) => x.name === n)!.value;
    return { listeners: get("JSEventListeners"), nodes: get("Nodes"), heap: get("JSHeapUsedSize") };
  };
  const samples = [];
  for (let round = 0; round < 3; round += 1) {
    for (const title of titles) await go(page, title);
    await go(page, titles[0]!);
    samples.push(await metrics());
  }

  console.log("LEAK SAMPLES", JSON.stringify(samples));
  const [a, , c] = samples as [(typeof samples)[0], unknown, (typeof samples)[0]];
  expect(c.listeners - a.listeners, "event listeners grew between round 1 and 3").toBeLessThan(
    a.listeners * 0.1 + 20,
  );
  expect(c.nodes - a.nodes, "DOM nodes grew").toBeLessThan(a.nodes * 0.1 + 200);
  expect(c.heap, "heap grew more than 50% between round 1 and 3").toBeLessThan(a.heap * 1.5);
  expect(list).toEqual([]);
});

test("no stale results: content of one tool never shows in another; back/forward restore routes", async ({
  page,
}) => {
  const list = problems(page);
  await page.goto("tools/json-formatter/");
  await settle(page);
  await cm(page).click();
  await page.keyboard.insertText('{"stale":"value"}');
  await expect(cm(page, 0)).toContainText("stale");
  await go(page, "XML Formatter");
  await expect(page.getByText("stale")).toHaveCount(0);
  await go(page, "Base64");
  await expect(page.getByText("stale")).toHaveCount(0);
  await go(page, "JWT Decoder");
  await expect(page.getByText("stale")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Base64");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("XML Formatter");
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Base64");
  await page.goto("tools/json-formatter/");
  await settle(page);
  await expect(page.getByText("stale")).toHaveCount(0); // a reload never resurrects input
  expect(list).toEqual([]);
});

test("a debounced Markdown render finishing after navigation does not error or leak into the next tool", async ({
  page,
}) => {
  const list = problems(page);
  await page.goto("tools/markdown-preview/");
  await settle(page);
  await cm(page).click();
  await page.keyboard.insertText("# Late heading\n\n" + "text ".repeat(4000));
  await go(page, "UUID Generator"); // leave while the worker/debounce is pending
  await page.waitForTimeout(2500);
  await expect(page.getByText("Late heading")).toHaveCount(0);
  await go(page, "Markdown Preview");
  await page.waitForTimeout(500);
  expect(list).toEqual([]);
});

test("JWT clock timer is stopped after leaving the tool (no updates on other pages)", async ({
  page,
}) => {
  const list = problems(page);
  await page.goto("tools/jwt-decoder/");
  await settle(page);
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  await page
    .getByRole("textbox", { name: "Token JWT" })
    .fill(`${b({ alg: "none" })}.${b({ exp: Math.floor(Date.now() / 1000) + 3600 })}.x`);
  await expect(page.getByText(/Còn hạn/)).toBeVisible();
  await go(page, "Base64");
  await page.waitForTimeout(3000);
  expect(list).toEqual([]);
});

test("theme switch while a tool has content keeps the content, editors and preview follow the theme", async ({
  page,
}) => {
  await page.goto("tools/markdown-preview/");
  await settle(page);
  await page.getByRole("button", { name: "Mẫu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Xin chào KunKit" })).toBeVisible({
    timeout: 15000,
  });
  const bg = () =>
    page.evaluate(() => {
      const editor = document.querySelector(".cm-editor") as HTMLElement;
      return getComputedStyle(editor).backgroundColor;
    });
  const light = await (async () => {
    await page.getByRole("radio", { name: "Sáng" }).click();
    await page.waitForTimeout(300);
    return bg();
  })();
  await page.getByRole("radio", { name: "Tối" }).click();
  await page.waitForTimeout(300);
  const dark = await bg();
  expect(dark).not.toBe(light);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(cm(page)).toContainText("Xin chào KunKit");
  await expect(page.getByRole("heading", { name: "Xin chào KunKit" })).toBeVisible();
  // Preview text must remain readable (not dark-on-dark): compare luminance of preview text vs its background.
  const contrastOk = await page.evaluate(() => {
    const el = document.querySelector("[class*=md-prose] p, [class*=md-prose] h1") as HTMLElement;
    const lum = (c: string) => {
      const [r, g, b] = c
        .match(/\d+/g)!
        .map(Number)
        .map((v) => {
          const s = v! / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    let bgNode: Element | null = el;
    let bgc = "rgba(0, 0, 0, 0)";
    while (bgNode && /rgba\(0, 0, 0, 0\)/.test((bgc = getComputedStyle(bgNode).backgroundColor)))
      bgNode = bgNode.parentElement;
    const a = lum(getComputedStyle(el).color);
    const b = lum(bgc);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrastOk).toBeGreaterThan(4.5);
});

test("Markdown: resizing across the narrow breakpoint keeps the text and falls back from split to edit", async ({
  page,
}) => {
  const list = problems(page);
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("tools/markdown-preview/");
  await settle(page);
  await page.getByRole("button", { name: "Mẫu", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Chia đôi" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "Xin chào KunKit" })).toBeVisible({
    timeout: 15000,
  });
  for (const width of [600, 375, 900, 320, 1200, 500]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(400);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(over, `overflow at ${width}`).toBeLessThanOrEqual(0);
    await expect(cm(page)).toContainText("Xin chào KunKit"); // text kept
    if (width < 768) {
      await expect(page.getByRole("radio", { name: "Chia đôi" })).toHaveCount(0);
      // exactly one pane visible
      const visiblePanes = await page
        .getByRole("region", { name: /^(Markdown|Xem trước)$/ })
        .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetWidth > 0).length);
      expect(visiblePanes, `visible panes at ${width}`).toBe(1);
    }
  }
  // Mobile: switch to preview, preview shows the heading; back to wide keeps working.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole("radio", { name: "Xem" }).click();
  await expect(page.getByRole("heading", { name: "Xin chào KunKit" })).toBeVisible();
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(400);
  // The explicit "Xem" choice persists on a wide screen; split can be chosen again with the text intact.
  await expect(page.getByRole("radio", { name: "Xem" })).toBeChecked();
  await page.getByRole("radio", { name: "Chia đôi" }).click();
  await expect(cm(page)).toContainText("Xin chào KunKit");
  await expect(page.getByRole("heading", { name: "Xin chào KunKit" })).toBeVisible();
  expect(list).toEqual([]);
});

test("mobile menu: opens, Esc closes, links navigate, focus returns to the menu button", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("tools/json-formatter/");
  await settle(page);
  const open = page.getByRole("button", { name: "Ẩn/hiện menu" });
  await open.click();
  await expect(page.getByRole("link", { name: "UUID Generator", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "UUID Generator", exact: true })).toBeHidden();
  await expect(open).toBeFocused();
  await open.click();
  await page.getByRole("link", { name: "UUID Generator", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("UUID Generator");
  await expect(page.getByRole("link", { name: "Base64", exact: true })).toBeHidden(); // menu closed after navigation
});
