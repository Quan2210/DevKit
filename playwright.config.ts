import { defineConfig } from "@playwright/test";

// E2E runs against the staged static build, served like GitHub Pages (base /DevKit/).
// Build first: VITE_BASE=/DevKit/ VITE_SITE_URL=https://quan2210.github.io npm run build
// Locally without a downloaded Chromium: PW_CHANNEL=msedge (or chrome) npm run test:e2e
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:4173/DevKit/",
    channel: process.env.PW_CHANNEL || undefined,
  },
  webServer: {
    command: "node scripts/serve.mjs stage 4173",
    url: "http://localhost:4173/DevKit/",
    reuseExistingServer: true,
    env: { VITE_BASE: "/DevKit/", VITE_SITE_URL: "https://quan2210.github.io" },
  },
});
