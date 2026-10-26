import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("hero introduction stops within five seconds, never loops or restarts, and keeps content readable", async ({
  page,
}, info) => {
  // Sweep every section and card in the expanded homepage motion sequence.
  test.setTimeout(90000);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") mutations.push(request.url());
  });
  await page.goto("/");
  const video = page.locator(".hero-video-backdrop video");
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.muted),
  ).toBe(true);
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video).toHaveClass("has-frame");
  await expect(page.getByText("Demo home footage", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /background video/ })).toHaveCount(0);
  await expect(page.locator(".hero-motion-control")).toHaveCount(0);
  await expect(video).not.toHaveAttribute("controls");
  await expect(video).not.toHaveAttribute("loop");
  // Native playback must stop while the hero is still visible, without a control.
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused), {
      timeout: 7000,
    })
    .toBe(true);
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeLessThanOrEqual(5);
  for (const section of await page.locator("[data-scroll-reveal]").all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveAttribute("data-revealed", "true");
  }
  await page.locator("#business-heading").scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  // The completed introduction retains its decoded frame after scrolling.
  await expect(video).toHaveCSS("opacity", "1");
  await page.evaluate(() => scrollTo(0, 0));
  await video.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  await page.locator("#business-heading").scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  await expect(page.locator("[data-revealed=true]")).toHaveCount(
    await page.locator("[data-scroll-reveal]").count(),
  );
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page).toHaveTitle(/Find healthy-home specialists/);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.locator(".home-hero").screenshot({
    path: `output/playwright/hero-motion-${info.project.name}.png`,
  });
  expect(mutations).toEqual([]);
});

test("reduced motion and data saving keep the hero static without video controls", async ({
  page,
}) => {
  const clips: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("demo-home-interior.mp4"))
      clips.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const video = page.locator(".hero-video-backdrop video");
  await expect(
    page.getByRole("button", { name: /background video/ }),
  ).toHaveCount(0);
  await page.locator("#business-heading").scrollIntoViewIfNeeded();
  await expect(video).not.toHaveAttribute("src");
  await expect(page.locator("[data-revealed=true]")).toHaveCount(0);
  expect(clips).toEqual([]);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(video).not.toHaveAttribute("src");
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: /background video/ }),
  ).toHaveCount(0);
  await expect(video).not.toHaveAttribute("src");
  await expect(page.locator(".hero-video-backdrop img")).toBeVisible();
});

test("blocked autoplay retains the poster without adding a playback control", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const autoplay = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "autoplay",
    )!;
    // Model a browser declining automatic playback, including the native flag.
    Object.defineProperty(HTMLMediaElement.prototype, "autoplay", {
      ...autoplay,
      set(this: HTMLMediaElement) {
        autoplay.set!.call(this, false);
      },
    });
    HTMLMediaElement.prototype.play = function () {
      return Promise.reject(
        new DOMException("Autoplay blocked", "NotAllowedError"),
      );
    };
  });
  await page.goto("/");
  const video = page.locator(".hero-video-backdrop video");
  await expect(video).toHaveAttribute("src", "/media/demo-home-interior.mp4");
  await expect(video).toHaveCSS("opacity", "0");
  await expect(page.locator(".hero-video-backdrop img")).toBeVisible();
  // Native `play` can fire before a decoder supplies the first frame.
  await video.evaluate((element) => element.dispatchEvent(new Event("play")));
  await expect(video).toHaveCSS("opacity", "0");
  await expect(
    page.getByRole("button", { name: /background video/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toBeEnabled();
});

test("video failure leaves a useful still-image fallback", async ({
  page,
  browserName,
}) => {
  await page.route("**/media/demo-home-interior.mp4", (route) => route.abort());
  await page.goto("/");
  if (browserName === "webkit") {
    // WebKit's native media transport can bypass request routing on Windows.
    // An invalid media source exercises the actual decoder/error event instead.
    await expect(page.locator(".hero-video-backdrop video")).toHaveAttribute(
      "src", "/media/demo-home-interior.mp4",
    );
    await page
      .locator(".hero-video-backdrop video")
      .evaluate((video: HTMLVideoElement) => {
        video.src = "data:video/mp4;base64,AAAA";
        video.load();
      });
  }
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Video unavailable. Still image shown." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /background video/ }),
  ).toHaveCount(0);
  await expect(page.locator(".hero-video-backdrop img")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toBeEnabled();
});

test("no-script homepage remains visible with a poster and no video transfer", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const clips: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("demo-home-interior.mp4"))
      clips.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /background video/ }),
  ).toHaveCount(0);
  await expect(page.locator(".hero-video-backdrop video")).not.toHaveAttribute(
    "src",
  );
  await expect(page.locator(".hero-video-backdrop img")).toBeVisible();
  expect(clips).toEqual([]);
  await context.close();
});

test("profile city map loads only on request and preserves honest location/fallback links", async ({
  page,
}, info) => {
  const requests: string[] = [];
  await page.route("https://www.google.com/maps?**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({
      contentType: "text/html",
      body: "<html lang='en'><head><title>City map fixture</title></head><body>City map preview fixture</body></html>",
    });
  });
  await page.goto("/professionals/demo-mold-inspection");
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(requests).toEqual([]);
  const toggle = page.getByRole("button", { name: "Show city map" });
  await expect(toggle).toBeEnabled();
  await toggle.press("Enter");
  await expect(
    page.getByText(/This is not an exact business address/),
  ).toBeVisible();
  // WebKit waits until a lazy iframe enters view before requesting it.
  await page.locator(".city-map iframe").scrollIntoViewIfNeeded();
  await expect(page.locator(".city-map iframe")).toBeInViewport();
  await expect(
    page.frameLocator(".city-map iframe").getByText("City map preview fixture"),
  ).toBeVisible();
  expect(new URL(requests[0]).searchParams.get("q")).toBe("Asheville, NC");
  await expect(
    page.getByRole("link", { name: /View city on Google Maps/ }),
  ).toHaveAttribute("href", /^https:\/\/www.google.com\/maps\/search\/?\?/);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.locator(".business-location-preview").screenshot({
    path: `output/playwright/city-map-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "Hide city map" }).press("Enter");
  await expect(page.locator("iframe")).toHaveCount(0);
});
