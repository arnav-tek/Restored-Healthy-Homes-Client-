import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "connected-consultation-fixes.spec.ts",
  workers: 1,
  timeout: 30000,
  reporter: "list",
  outputDir: "output/playwright/consultation-fixes-results",
  use: {
    baseURL: "http://127.0.0.1:3242",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/serve-consultation-regressions.mjs",
    url: "http://127.0.0.1:3242",
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
