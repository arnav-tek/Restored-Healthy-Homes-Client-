import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { categories } from "../../src/domain/categories";
import { mainNav } from "./helpers/application";
import { signIn } from "./helpers/demo-sign-in";
import { section } from "./helpers/dashboard";

async function inspect(page: Page, name: string) {
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
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/phase-2h1-${name}.png`,
    fullPage: true,
  });
}

test("homepage categories, truthful statistics and About Us navigation work with keyboard and responsive layouts", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Find healthy-home professionals/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  if (info.project.name === "mobile") {
    const search = page.getByRole("button", { name: "Search", exact: true });
    await expect(search).toBeInViewport({ ratio: 1 });
    const bounds = await search.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  }
  const browse = page.getByRole("list", { name: "Browse specialties" });
  await expect(browse.getByRole("link")).toHaveCount(8);
  for (const category of categories) {
    await expect(
      browse.getByRole("link").filter({
        has: page.getByRole("heading", { name: category.name, exact: true }),
      }),
    ).toHaveAttribute("href", `/directory?category=${category.id}`);
  }
  await expect(page.getByTestId("home-professional-count")).toHaveText("8");
  await expect(page.getByTestId("home-state-count")).toHaveText("7");
  await expect(page.getByTestId("home-rating")).toHaveText("4.2 out of 5");
  await page.getByText("How these figures work", { exact: true }).click();
  await expect(page.getByTestId("home-statistics")).toContainText(
    "averages individual published reviews",
  );
  await page.getByText("How these figures work", { exact: true }).click();
  await browse.getByRole("link").first().focus();
  await expect(browse.getByRole("link").first()).toBeFocused();
  await inspect(page, `home-${info.project.name}`);
  await browse.getByRole("link").first().press("Enter");
  await expect(page).toHaveURL("/directory?category=mold-inspection");
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
  for (const category of categories.slice(1)) {
    await mainNav(page, "Home");
    await browse
      .getByRole("link")
      .filter({
        has: page.getByRole("heading", { name: category.name, exact: true }),
      })
      .click();
    await expect(page).toHaveURL(`/directory?category=${category.id}`);
    await expect(page.getByTestId("professional-card")).toHaveCount(1);
  }
  await mainNav(page, "About Us");
  await expect(page).toHaveURL("/about");
  await expect(page).toHaveTitle(/About Us/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Us");
  await expect(
    page.getByText("Client story pending", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("about-video-placeholder")).toBeVisible();
  await expect(page.locator("main video, main iframe")).toHaveCount(0);
  await expect(
    page.getByTestId("about-video-placeholder").getByRole("button"),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("contentinfo")
      .getByRole("link", { name: "About Us", exact: true }),
  ).toHaveAttribute("href", "/about");
  await page
    .getByRole("link", { name: "Browse professionals", exact: true })
    .focus();
  await expect(
    page.getByRole("link", { name: "Browse professionals", exact: true }),
  ).toBeFocused();
  await inspect(page, `about-${info.project.name}`);
  if (info.project.name === "desktop") {
    for (const width of [1280, 1279]) {
      await page.setViewportSize({ width, height: 1000 });
      await inspect(page, `about-navigation-${width}`);
      await mainNav(page, "Home");
      await mainNav(page, "About Us");
      await expect(page).toHaveURL("/about");
    }
  }
  expect(errors).toEqual([]);
});

test("homepage rating follows the existing review moderation session and refresh restores seeds", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  await page.goto("/professionals/demo-mold-inspection");
  await page
    .getByLabel("Display name (sample)", { exact: true })
    .fill("Homepage Sample");
  await page.getByLabel("Rating (sample)", { exact: true }).selectOption("1");
  await page
    .getByLabel("Written review (sample)", { exact: true })
    .fill("A fictional service conversation for this homepage example.");
  await page
    .getByRole("button", { name: "Submit demo review", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Demo review pending", exact: true }),
  ).toBeVisible();
  await mainNav(page, "Home");
  await expect(page.getByTestId("home-rating")).toHaveText("4.2 out of 5");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Admin area", exact: true })
    .click();
  await signIn(page, "admin");
  await expect(
    page.getByRole("heading", {
      name: "Your directory at a glance",
      exact: true,
    }),
  ).toBeVisible();
  await section(page, "Admin", "Reviews");
  await page
    .getByRole("link", { name: "Review by Homepage Sample", exact: true })
    .click();
  await page
    .getByLabel("Internal review note (optional)")
    .fill("HOMEPAGE_INTERNAL_NOTE");
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .click();
  await expect(page.getByTestId("moderation-review-status")).toHaveText(
    "published",
  );
  await page
    .getByRole("link", { name: "View public review preview", exact: true })
    .click();
  await expect(page.getByTestId("review-summary")).toHaveText(
    "3.8 out of 55 published fictional reviews",
  );
  await mainNav(page, "Home");
  await expect(page.getByTestId("home-rating")).toHaveText("3.7 out of 5");
  await expect(page.getByTestId("home-statistics")).toContainText(
    "7 published fictional reviews",
  );
  await expect(page.locator("main")).not.toContainText(
    "HOMEPAGE_INTERNAL_NOTE",
  );
  if (info.project.name === "desktop") {
    for (const width of [1280, 1279]) {
      await page.setViewportSize({ width, height: 1000 });
      await inspect(page, `signed-in-navigation-${width}`);
      await mainNav(page, "About Us");
      await mainNav(page, "Home");
    }
  }
  await mainNav(page, "Dashboard");
  await expect(
    page.getByRole("heading", {
      name: "Your directory at a glance",
      exact: true,
    }),
  ).toBeVisible();
  await section(page, "Admin", "Reviews");
  await page
    .getByRole("link", { name: "Review by Homepage Sample", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reject review", exact: true })
    .click();
  await expect(page.getByTestId("moderation-review-status")).toHaveText(
    "rejected",
  );
  await mainNav(page, "Home");
  await expect(page.getByTestId("home-rating")).toHaveText("4.2 out of 5");
  await page.reload();
  await expect(page.getByTestId("home-rating")).toHaveText("4.2 out of 5");
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
  expect(mutations).toEqual([]);
});

test("refined pages reflow at 320px and with enlarged text; short-screen navigation remains usable", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Explicit narrow and text-size checks run once.",
  );
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/", "/about"]) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(route);
    await inspect(page, `${route === "/" ? "home" : "about"}-320`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    if (route === "/") {
      await expect(
        page.getByRole("form", { name: "Find professionals", exact: true }),
      ).toHaveAttribute("data-ready", "true");
    } else {
      // Wait for the shared header to hydrate before applying text-size overrides.
      await mainNav(page, "Home");
      await mainNav(page, "About Us");
    }
    // Simulate 200% text enlargement without changing the viewport or hiding content.
    await page.evaluate(() => {
      const elements = [
        ...document.querySelectorAll<HTMLElement>(
          "body, h1, h2, h3, p, span, a, button, label, input, select, summary, dt, dd, li",
        ),
      ];
      const sizes = elements.map((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      );
      elements.forEach((element, index) => {
        element.style.fontSize = `${sizes[index] * 2}px`;
      });
    });
    await inspect(page, `${route === "/" ? "home" : "about"}-text-200`);
    for (const mark of await page.locator(".brand-mark").all()) {
      expect(
        await mark.evaluate((element) => element.scrollWidth),
      ).toBeLessThanOrEqual(
        await mark.evaluate((element) => element.clientWidth),
      );
    }
    if (route === "/") {
      const search = page.getByRole("button", { name: "Search", exact: true });
      await search.scrollIntoViewIfNeeded();
      await expect(search).toBeInViewport({ ratio: 1 });
      await page.getByLabel("City or ZIP code").fill("27601");
      await page
        .getByLabel("Professional category")
        .selectOption("healthy-trades");
      await search.click();
      await expect(page).toHaveURL(/category=healthy-trades&location=27601$/);
    }
  }
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav
    .getByRole("link", { name: "List Your Business", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    nav.getByRole("link", { name: "List Your Business", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await nav
    .getByRole("link", { name: "List Your Business", exact: true })
    .press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await inspect(page, "short-screen-navigation");
  expect(errors).toEqual([]);
});

test("static homepage and About Us remain useful without JavaScript; statistics failures do not invent zeros", async ({
  browser,
  request,
  page,
}, info) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize()!,
  });
  const noJs = await context.newPage();
  await noJs.goto("http://127.0.0.1:3100/");
  await expect(
    noJs.getByRole("list", { name: "Browse specialties" }).getByRole("link"),
  ).toHaveCount(8);
  await expect(noJs.getByTestId("home-rating")).toHaveText("4.2 out of 5");
  await noJs
    .getByRole("main")
    .getByRole("link", { name: "About Us", exact: true })
    .click();
  await expect(noJs).toHaveURL("http://127.0.0.1:3100/about");
  await expect(noJs.getByTestId("about-video-placeholder")).toBeVisible();
  await expect(noJs.locator("video, iframe")).toHaveCount(0);
  await context.close();
  for (const route of ["/", "/about"]) {
    const response = await request.get(route);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const html = await response.text();
    for (const hidden of [
      "REVIEW_PRIVATE_NOTE",
      "privateContact",
      "synthetic-customer",
      "Pending Example Practice",
    ])
      expect(html).not.toContain(hidden);
  }
  await page.goto("http://127.0.0.1:3101/");
  await expect(page.getByText(/Demo statistics are unavailable/)).toBeVisible();
  await expect(page.getByTestId("home-professional-count")).toHaveCount(0);
  await inspect(page, `unavailable-${info.project.name}`);
});
