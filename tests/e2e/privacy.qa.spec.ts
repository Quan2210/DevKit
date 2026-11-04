import { expect, test, type Page } from "@playwright/test";

/**
 * QA gate 2: privacy. Every tool is used with a unique marker; afterwards no request may have left the
 * origin and no browser storage may contain the marker (except the two documented opt-ins).
 */
const BASE = "http://localhost:4173";
const MARK = "QAsecretMARKER7731";

function watch(page: Page) {
  const external: { url: string; referer?: string }[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith(`${BASE}/`) || url.startsWith("data:") || url.startsWith("blob:")) return;
    external.push({ url, referer: request.headers()["referer"] });
  });
  return external;
}

async function dumpStorage(page: Page) {
  return page.evaluate(async () => {
    const out: Record<string, unknown> = {
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
    };
    const dbs = await (indexedDB.databases?.() ?? Promise.resolve([]));
    out["idb"] = dbs.map((d) => d.name);
    const caches = await globalThis.caches?.keys?.();
    out["caches"] = caches ?? [];
    return out;
  });
}

const cm = (page: Page, nth = 0) => page.locator(".cm-content").nth(nth);
async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}
async function typeCm(page: Page, text: string, nth = 0) {
  await cm(page, nth).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(text);
}

test.describe("privacy: no off-origin requests and no stored user input", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  });

  test("JSON, XML, Base64, JWT, UUID leave no request and no storage", async ({ page }) => {
    const external = watch(page);
    const jwt = (() => {
      const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
      return `${b({ alg: "HS256" })}.${b({ sub: MARK, exp: 4102444800 })}.sig`;
    })();

    await page.goto("tools/json-formatter/");
    await ready(page);
    await typeCm(page, `{"${MARK}":[1,2,3]}`);
    await page.getByRole("button", { name: "Format sang ô phải" }).click();
    await page.getByRole("button", { name: "Copy sang ô phải" }).click();
    await page.getByRole("button", { name: /^Copy/ }).first().click();
    await page.getByRole("button", { name: "Xóa" }).first().click();

    await page.goto("tools/xml-formatter/");
    await ready(page);
    await typeCm(page, `<a>${MARK}</a>`);
    await page.getByRole("button", { name: "Format sang ô phải" }).click();

    await page.goto("tools/base64/");
    await ready(page);
    await typeCm(page, MARK);

    await page.goto("tools/jwt-decoder/");
    await ready(page);
    await page.getByRole("textbox", { name: "Token JWT" }).fill(jwt);
    await expect(page.getByText(MARK).first()).toBeVisible();

    await page.goto("tools/uuid-generator/");
    await ready(page);
    await page.getByRole("button", { name: "Tạo UUID" }).click();
    await page.getByRole("button", { name: "Copy tất cả" }).click();

    const storage = JSON.stringify(await dumpStorage(page));
    expect(storage).not.toContain(MARK);
    expect(external).toEqual([]);
  });

  test("color tools: only Recent Colors is stored, nothing leaves", async ({ page }) => {
    const external = watch(page);
    await page.goto("tools/color-picker/");
    await ready(page);
    await page.getByLabel("HEX", { exact: true }).fill("#123456");
    await page.waitForTimeout(800);
    await page.goto("tools/color-palette/");
    await ready(page);
    await page.goto("tools/color-contrast/");
    await ready(page);
    await page.getByLabel("Màu chữ", { exact: true }).fill("#234567");
    await page.goto("tools/css-gradient/");
    await ready(page);
    await page.getByRole("button", { name: "Thêm điểm màu" }).click();
    const s = await dumpStorage(page);

    console.log("COLOR STORAGE", JSON.stringify(s));
    const keys = Object.keys(s["local"] as object);
    expect(keys.length).toBeLessThanOrEqual(2);
    expect(
      Object.keys(s["session"] as object).filter((k) => k !== "react-router-scroll-positions"),
    ).toEqual([]);
    expect(s["cookie"]).toBe("");
    expect(external).toEqual([]);
  });

  test("markdown: default no storage; images off then on after confirm carry no referrer", async ({
    page,
  }) => {
    const external = watch(page);
    await page.route("https://img.qa.test/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64",
        ),
      }),
    );
    await page.goto("tools/markdown-preview/");
    await ready(page);
    await typeCm(page, `# ${MARK}\n\n![pic](https://img.qa.test/a.png)\n`);
    await page.getByRole("radio", { name: "Xem" }).click();
    await expect(page.getByText(MARK).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);
    expect(external, "image must not be requested by default").toEqual([]);
    expect(JSON.stringify(await dumpStorage(page))).not.toContain(MARK);
    await expect(page.getByText("Ảnh bị chặn").first()).toBeVisible();

    // Copy/Download paths
    await page.getByRole("button", { name: "Copy" }).first().click();
    await page.getByRole("menuitem", { name: "Copy HTML" }).click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain(MARK);
    expect(clip).not.toContain("img.qa.test");

    // Opt in
    await page.getByRole("checkbox", { name: "Tải ảnh ngoài" }).click();
    await page.getByRole("button", { name: "Bật tải ảnh ngoài" }).click();
    await expect(page.getByText("Ảnh ngoài đang bật")).toBeVisible();
    await expect.poll(() => external.length, { timeout: 10000 }).toBeGreaterThan(0);
    for (const r of external) {
      expect(r.url).toContain("img.qa.test");
      expect(r.referer ?? "").toBe("");
    }
    // opt-in must not persist
    expect(JSON.stringify(await dumpStorage(page))).not.toContain(MARK);
    await page.reload();
    await ready(page);
    await expect(page.getByText("Ảnh ngoài đang bật")).toHaveCount(0);
  });

  test("markdown draft toggle: stored only when on, removed when off", async ({ page }) => {
    await page.goto("tools/markdown-preview/");
    await ready(page);
    await typeCm(page, `draft ${MARK}`);
    await page.waitForTimeout(1500);
    expect(JSON.stringify(await dumpStorage(page))).not.toContain(MARK);
    await page.getByRole("checkbox", { name: "Nhớ bản nháp trên thiết bị này" }).click();
    await typeCm(page, `draft ${MARK} two`);
    await page.waitForTimeout(1500);
    expect(JSON.stringify(await dumpStorage(page))).toContain(MARK);
    await page.getByRole("checkbox", { name: "Nhớ bản nháp trên thiết bị này" }).click();
    await page.waitForTimeout(500);
    expect(JSON.stringify(await dumpStorage(page))).not.toContain(MARK);
  });
});
