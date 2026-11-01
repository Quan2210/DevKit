import { defineConfig } from "@playwright/test";

// E2E runs against the staged static build (see scripts/serve.mjs), added with M1.
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:4173" },
});
