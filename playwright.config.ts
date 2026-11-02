import { defineConfig } from "@playwright/test";
import { BASE_PATH, BASE_URL, ORIGIN } from "./tests/e2e/env";

// E2E runs against the staged static build, served like GitHub Pages.
// Build first: VITE_BASE=/DevKit/ VITE_SITE_URL=https://quan2210.github.io npm run build
// Locally without a downloaded Chromium: PW_CHANNEL=msedge (or chrome) npm run test:e2e
// It reuses a server already listening on the port, so build before running to test the latest code.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node scripts/serve.mjs stage ${new URL(ORIGIN).port || 4173}`,
    url: BASE_URL,
    reuseExistingServer: true,
    env: { VITE_BASE: BASE_PATH, VITE_SITE_URL: "https://quan2210.github.io" },
  },
});
