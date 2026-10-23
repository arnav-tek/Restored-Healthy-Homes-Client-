import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// A focused engine matrix complements the full Chromium viewport regression.
export default defineConfig({
  ...base,
  testMatch: [
    "quality-audit.spec.ts",
    "homepage-motion.spec.ts",
    "admin-completion.spec.ts",
    "admin-showcase.spec.ts",
    "search.spec.ts",
  ],
  projects: [
    {
      name: "firefox",
      use: { browserName: "firefox", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "edge",
      use: {
        browserName: "chromium",
        channel: "msedge",
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
  ],
});
