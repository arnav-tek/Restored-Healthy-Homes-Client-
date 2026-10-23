import { test, expect, type Page } from "@playwright/test";

async function trackMotion(page: Page) {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this instanceof HTMLElement && this.matches("[data-scroll-reveal]")) {
        this.dataset.testMotionRuns = String(
          Number(this.dataset.testMotionRuns ?? 0) + 1,
        );
        this.dataset.testMotionDelay = String(
          typeof options === "object" ? (options?.delay ?? 0) : 0,
        );
      }
      return animate.call(this, frames, options);
    };
  });
}

const pages = [
  { name: "home", path: "/", target: ".home-categories [data-scroll-reveal]" },
  { name: "about", path: "/about", target: ".about-value-card" },
  { name: "certifications", path: "/education", target: ".education-pathway" },
  { name: "pricing", path: "/pricing", target: ".pricing-guidance-card" },
  { name: "directory", path: "/directory", target: ".professional-card" },
  { name: "resources", path: "/resources", target: ".resource-card" },
  {
    name: "profile",
    path: "/professionals/demo-mold-inspection",
    target: "[aria-labelledby=credentials-heading]",
  },
  { name: "questions", path: "/questions", target: ".qa-card-item" },
  { name: "consultations", path: "/consultations", target: ".process-step" },
] as const;

for (const item of pages) {
  test(`scroll motion reveals ${item.name} content once without hiding text`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydrat|server rendered|minified React error/i.test(message.text())
      ) {
        errors.push(message.text());
      }
    });
    await trackMotion(page);
    await page.goto(item.path);
    const target = page.locator(item.target).last();
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveAttribute("data-revealed", "true");
    await expect(target).toHaveAttribute("data-test-motion-runs", "1");
    await expect(target).toHaveCSS("opacity", "1");
    await expect
      .poll(() => target.evaluate((element) => element.getAnimations().length))
      .toBe(0);
    await expect(target).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveAttribute("data-test-motion-runs", "1");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({
      path: `output/playwright/scroll-motion-${item.name}-${info.project.name}.png`,
    });
    expect(errors).toEqual([]);
  });
}

test("card groups stagger within a short delay and navigation discovers new page content", async ({
  page,
}, info) => {
  await trackMotion(page);
  await page.goto("/");
  await page.locator(".home-categories").scrollIntoViewIfNeeded();
  await expect(
    page.locator(".home-categories [data-revealed=true]").first(),
  ).toBeVisible();
  const delays = await page
    .locator(".home-categories [data-test-motion-delay]")
    .evaluateAll((elements) =>
      elements.map((element) =>
        Number((element as HTMLElement).dataset.testMotionDelay),
      ),
    );
  expect(delays.length).toBeGreaterThan(0);
  expect(delays.every((delay) => delay >= 0 && delay <= 192)).toBe(true);
  if (info.project.name === "desktop")
    expect(delays.some((delay) => delay > 0)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  // A Next Link transition keeps the shared layout/observer component mounted.
  const about = page.locator(".site-header a[href='/about']");
  if (!(await about.isVisible())) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await about.click();
  await expect(page).toHaveURL(/\/about$/);
  const story = page.locator(".about-story-media");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-test-motion-runs", "1");
  await expect
    .poll(() => story.evaluate((element) => element.getAnimations().length))
    .toBe(0);
});

test("new content is observed and keyboard focus cancels its entrance", async ({
  page,
}) => {
  await trackMotion(page);
  await page.goto("/about");
  // Add the fixture after hydration; the initial React mount can replace DOM
  // inserted into the server-rendered main landmark before it finishes.
  await expect(page.locator(".about-hero-content")).toHaveAttribute(
    "data-test-motion-runs",
    "1",
  );
  await expect
    .poll(() =>
      page
        .locator(".about-hero-content")
        .evaluate((element) => element.getAnimations().length),
    )
    .toBe(0);
  await page.evaluate(() => {
    const card = document.createElement("article");
    card.id = "motion-added-content";
    card.dataset.scrollReveal = "";
    const link = document.createElement("a");
    link.href = "/directory";
    link.textContent = "Explore specialists";
    card.append(link);
    document.getElementById("main")!.append(card);
  });
  const card = page.locator("#motion-added-content");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-test-motion-runs", "1");
  await card.getByRole("link").focus();
  await expect(card.getByRole("link")).toBeFocused();
  await expect
    .poll(() => card.evaluate((element) => element.getAnimations().length))
    .toBe(0);
  await expect(card).toHaveCSS("translate", "none");
});

test("reduced motion stays static and changing the preference cancels active effects", async ({
  page,
}) => {
  await trackMotion(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  const card = page.locator(".about-value-card").last();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  await expect(page.locator("[data-test-motion-runs]")).toHaveCount(0);
  await expect(card).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(card).toHaveAttribute("data-test-motion-runs", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => card.evaluate((element) => element.getAnimations().length))
    .toBe(0);
  await expect(card).toHaveCSS("translate", "none");
});

for (const mode of ["no-javascript", "no-observer"] as const) {
  test(`page content remains readable with ${mode}`, async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: mode !== "no-javascript",
    });
    if (mode === "no-observer")
      await context.addInitScript(() => {
        Object.defineProperty(window, "IntersectionObserver", {
          value: undefined,
          configurable: true,
        });
      });
    const page = await context.newPage();
    await page.goto("/about");
    const closing = page.locator(".about-closing-section");
    await closing.scrollIntoViewIfNeeded();
    await expect(closing).toBeVisible();
    await expect(closing).toHaveCSS("opacity", "1");
    await expect(closing).toHaveCSS("translate", "none");
    await expect(page.locator("[data-revealed=true]")).toHaveCount(0);
    await context.close();
  });
}
