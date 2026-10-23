import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

// Local lab measurements, not production Core Web Vitals or a speed guarantee.
const baseURL = "http://127.0.0.1:3102";
const label = process.argv[2] ?? "latest";
if (!/^[a-z0-9-]+$/.test(label))
  throw new Error("Use a lowercase report label.");
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3102",
  ],
  {
    env: { ...process.env, RHH_APP_MODE: "demo" },
    stdio: "ignore",
    windowsHide: true,
  },
);
let exited = false;
server.on("exit", () => {
  exited = true;
});
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    if (exited)
      throw new Error(
        "Local preview could not start on port 3102. Build the demo first and free this port.",
      );
    try {
      if ((await fetch(baseURL)).ok) break;
    } catch {
      /* Wait for the local server. */
    }
    if (attempt >= 59) throw new Error("Local preview startup timed out.");
    await delay(500);
  }
  browser = await chromium.launch();
  const reports = [];
  for (const route of ["/", "/directory", "/resources", "/demo/admin"]) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const session = await context.newCDPSession(page);
      await session.send("Network.enable");
      await session.send("Network.setCacheDisabled", { cacheDisabled: true });
      await session.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 93750,
      });
      await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(() => {
        window.__qualityMetrics = { lcp: 0, cls: 0, longTaskMs: 0 };
        for (const type of [
          "largest-contentful-paint",
          "layout-shift",
          "longtask",
        ]) {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (type === "largest-contentful-paint")
                window.__qualityMetrics.lcp = entry.startTime;
              if (type === "layout-shift" && !entry.hadRecentInput)
                window.__qualityMetrics.cls += entry.value;
              if (type === "longtask")
                window.__qualityMetrics.longTaskMs += Math.max(
                  0,
                  entry.duration - 50,
                );
            }
          }).observe({ type, buffered: true });
        }
      });
      const response = await page.goto(`${baseURL}${route}`);
      if (response?.status() !== 200)
        throw new Error(
          `Unexpected response for ${route}: ${response?.status()}`,
        );
      await page.waitForFunction(
        () =>
          document.querySelector(
            "form[data-ready=true], .login-shortcuts, [data-demo-account]",
          ) || document.readyState === "complete",
      );
      await delay(3000);
      if (pageErrors.length)
        throw new Error(
          `Page errors while measuring ${route}: ${pageErrors.join("; ")}`,
        );
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        const resources = performance.getEntriesByType("resource");
        const js = resources.filter(
          (item) => item.name.includes("/_next/") && item.name.includes(".js"),
        );
        return {
          ...window.__qualityMetrics,
          ttfb: navigation.responseStart - navigation.requestStart,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          jsRequests: js.length,
          jsEncodedBytes: js.reduce(
            (sum, item) => sum + item.encodedBodySize,
            0,
          ),
          jsDecodedBytes: js.reduce(
            (sum, item) => sum + item.decodedBodySize,
            0,
          ),
          resourceEncodedBytes: resources.reduce(
            (sum, item) => sum + item.encodedBodySize,
            0,
          ),
          media: resources
            .filter((item) => /\.(mp4|jpg)|\/_next\/image/.test(item.name))
            .map((item) => ({
              path: new URL(item.name).pathname,
              bytes: item.encodedBodySize,
            })),
        };
      });
      reports.push({ route, run, ...metrics });
      console.log(
        `${route} run ${run}: LCP ${Math.round(metrics.lcp)} ms, CLS ${metrics.cls.toFixed(3)}, JS ${Math.round(metrics.jsEncodedBytes / 1024)} KiB`,
      );
      await context.close();
    }
  }
  await mkdir("output", { recursive: true });
  await writeFile(
    `output/quality-performance-${label}.json`,
    JSON.stringify(
      {
        environment: {
          browser: await browser.version(),
          viewport: "390x844",
          cpuSlowdown: 4,
          latencyMs: 150,
          downloadBytesPerSecond: 200000,
          reducedMotion: true,
          coldCache: true,
          samplesPerRoute: 3,
          observation:
            "3 seconds after load; longTaskMs is observed blocking time, not Lighthouse TBT",
        },
        reports,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  server.kill();
}
