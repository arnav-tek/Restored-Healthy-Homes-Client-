import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "connected-categories.spec.ts",
  workers: 1,
  timeout: 30000,
  reporter: "list",
  outputDir: "output/playwright/category-results",
  use: {
    baseURL: "http://127.0.0.1:3244",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/serve-category-regressions.mjs",
    url: "http://127.0.0.1:3244",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 320, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
