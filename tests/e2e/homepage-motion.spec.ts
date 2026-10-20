import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("local hero video supports keyboard pause, offscreen pausing and readable responsive content", async ({
  page,
}, info) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") mutations.push(request.url());
  });
  await page.goto("/");
  const video = page.locator(".hero-video-backdrop video");
  await expect(
    page.getByRole("button", { name: "Pause background video" }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  expect(
    await video.evaluate(
      (element: HTMLVideoElement) => element.muted && element.playsInline,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Pause background video" })
    .press("Enter");
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  for (const section of await page.locator("[data-scroll-reveal]").all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveAttribute("data-revealed", "true");
  }
  await page.locator("#business-heading").scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(
    page.getByRole("button", { name: "Play background video" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Play background video" })
    .press("Enter");
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(false);
  await page.locator("#business-heading").scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  await expect(page.locator("[data-revealed=true]")).toHaveCount(3);
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

test("reduced motion and data saving keep video unloaded until explicit play", async ({
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
    page.getByRole("button", { name: "Play background video" }),
  ).toBeEnabled();
  await page.locator("#business-heading").scrollIntoViewIfNeeded();
  await expect(video).not.toHaveAttribute("src");
  await expect(page.locator("[data-revealed=true]")).toHaveCount(0);
  expect(clips).toEqual([]);
  await page.evaluate(() => scrollTo(0, 0));
  await page
    .getByRole("button", { name: "Play background video" })
    .press("Enter");
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Play background video" }),
  ).toBeEnabled();
  await expect(video).not.toHaveAttribute("src");
});

test("video failure leaves a useful still-image fallback", async ({ page }) => {
  await page.route("**/media/demo-home-interior.mp4", (route) => route.abort());
  await page.goto("/");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Video unavailable. Still image shown." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play background video" }),
  ).toBeDisabled();
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
    page.getByRole("button", { name: "Play background video" }),
  ).toBeDisabled();
  await expect(page.locator(".hero-video-backdrop video")).not.toHaveAttribute(
    "src",
  );
  await expect(
    page.getByText("Still image shown. JavaScript enables video controls."),
  ).toBeVisible();
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
  await toggle.press("Enter");
  await expect(
    page.getByText(/This is not an exact business address/),
  ).toBeVisible();
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
