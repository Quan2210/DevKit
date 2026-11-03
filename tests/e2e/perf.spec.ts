import { expect, test } from "@playwright/test";

// Tracing snapshots the whole DOM on every action, which would dominate a ~1 MB measurement.
test.use({ trace: "off" });

const ready = async (page: import("@playwright/test").Page) => {
  await page.waitForLoadState("networkidle");
  await page.locator(".cm-content").first().waitFor();
};

test("typing in a ~1 MB document in Split view stays responsive, and the preview swap is one short task", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("tools/markdown-preview/");
  await ready(page);
  const block =
    "## Heading\n\nParagraph with **bold** and `code` and a [link](https://example.com).\n\n- item one\n- item two\n\n";
  const big = block.repeat(Math.ceil(1_000_000 / block.length));
  await page.locator("input[type=file]").setInputFiles({
    name: "big.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(big),
  });
  // Split view is the default on desktop: the preview must be showing this document.
  await expect(page.locator("#md-heading").first()).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__long.push(entry.duration);
    }).observe({ entryTypes: ["longtask"] });
  });
  await page.locator(".cm-content").first().click();
  const latencies: number[] = [];
  for (let i = 0; i < 30; i += 1) {
    const started = Date.now();
    await page.keyboard.type("x");
    latencies.push(Date.now() - started);
    await page.waitForTimeout(80);
  }
  // The debounced render of a ~1 MB list-heavy document takes tens of seconds in the worker.
  await page.waitForTimeout(40_000);
  const durations = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
  const longest = Math.max(0, ...durations);
  test.info().annotations.push({
    type: "responsiveness",
    description: `keystroke p95 ${p95} ms; ${durations.length} long tasks, longest ${Math.round(longest)} ms`,
  });
  expect(p95).toBeLessThan(150); // round trip incl. Playwright overhead (~15-60 ms measured)
  expect(longest).toBeLessThan(500); // the one preview swap (about 190 ms measured)
});
