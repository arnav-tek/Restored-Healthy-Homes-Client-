import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/demo-sign-in";
import { mainNav, fillApplication } from "./helpers/application";
import { section, review, decision, resetSession } from "./helpers/dashboard";

test.setTimeout(150000);
const fern = "Fern & Field Inspections";
const business = "Session Sample Business";
const sample = {
  name: "sample.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
};
const observations = new WeakMap<
  Page,
  { mutations: string[]; errors: string[] }
>();

async function account(page: Page, name: string) {
  if (
    name === "admin" &&
    (await page.locator('[data-demo-account="admin"]').count())
  )
    return signIn(page, name);
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Member area", exact: true })
    .click();
  await expect(page).toHaveURL("/demo/member");
  if (name === "admin") {
    if (!(await page.locator("[data-demo-account]").count()))
      await signIn(page, "approved");
    await page
      .getByRole("navigation", { name: "Workspaces" })
      .getByRole("link", { name: "Admin overview", exact: true })
      .click();
  }
  await signIn(page, name);
}
async function inspect(page: Page, name: string) {
  await expect(page).toHaveTitle(/\S/);
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
  await page.screenshot({
    path: `output/playwright/connected-${name}.png`,
    fullPage: true,
  });
}
async function membership(page: Page, name: string, status: string) {
  await section(page, "Admin", "Membership");
  await page.getByRole("link", { name: `Manage ${name}`, exact: true }).click();
  await page.getByLabel("Simulated membership status").selectOption(status);
  await page
    .getByLabel("Scenario note", { exact: true })
    .fill("Private connected membership example");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Apply membership scenario" }).click();
}
async function directorySearch(page: Page, name: string) {
  await mainNav(page, "Find Specialists");
  await expect(
    page.getByRole("form", { name: "Directory filters" }),
  ).toHaveAttribute("data-ready", "true");
  await page.getByLabel("Keyword", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/q=/);
}
test.beforeEach(async ({ page }) => {
  const mutations: string[] = [];
  const errors: string[] = [];
  observations.set(page, { mutations, errors });
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(observations.get(page)?.mutations).toEqual([]);
  expect(observations.get(page)?.errors).toEqual([]);
});

test("linked suspension removes directory, profile, featured and ratings; payment recovery cannot clear it", async ({
  page,
}, info) => {
  await page.goto("/demo/admin");
  await signIn(page, "admin");
  await section(page, "Admin", "Listings");
  await review(page, fern);
  page.once("dialog", (dialog) => dialog.accept());
  await decision(page, "suspend", "Private connected suspension note");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Profile unavailable", exact: true }),
  ).toBeVisible();
  await mainNav(page, "Home");
  await expect(page.getByTestId("home-professional-count")).toHaveText("7");
  await expect(
    page.locator(".featured-card").filter({ hasText: fern }),
  ).toHaveCount(0);
  await directorySearch(page, "Fern");
  await expect(page.getByTestId("professional-card")).toHaveCount(0);
  await account(page, "admin");
  await membership(page, fern, "past_due");
  await account(page, "fern");
  await section(page, "Member", "Membership");
  await page
    .getByRole("button", { name: "Review recovery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate successful payment", exact: true })
    .click();
  await expect(page.getByTestId("billing-status")).toHaveText("active");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Profile unavailable", exact: true }),
  ).toBeVisible();
  await account(page, "admin");
  await section(page, "Admin", "Listings");
  await review(page, fern);
  await decision(page, "reinstate", "Connected review complete");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(fern);
  await mainNav(page, "Home");
  await expect(page.getByTestId("home-professional-count")).toHaveText("8");
  await expect(
    page.locator(".featured-card").filter({ hasText: fern }),
  ).toHaveCount(1);
  await inspect(page, `eligibility-${info.project.name}`);
});

test("accepted category/profile/free-call changes reach public cards, profile, homepage search and pricing", async ({
  page,
}, info) => {
  await page.goto("/demo/admin?section=categories");
  await signIn(page, "admin");
  await section(page, "Admin", "Categories");
  await page.getByLabel("Category to rename").selectOption("mold-inspection");
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Connected Inspection Specialists");
  await page
    .getByRole("button", { name: "Rename category", exact: true })
    .click();
  await page.getByLabel("New category name").fill("Connected Pilot Specialty");
  await page
    .getByLabel("Category description", { exact: true })
    .fill("A provisional specialty for this fictional demonstration.");
  await page.getByLabel("Preview monthly price (USD)").fill("123");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  const addedId = await page
    .getByLabel("Category to rename")
    .locator("option")
    .filter({ hasText: "Connected Pilot Specialty" })
    .getAttribute("value");
  await account(page, "fern");
  await section(page, "Member", "Profile");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Connected Fern Studio");
  await page
    .getByLabel("Business description", { exact: true })
    .fill("Accepted connected profile copy for this fictional business.");
  await page
    .getByLabel("Listed credentials (optional)")
    .fill("Changed fictional credential");
  await page
    .getByRole("checkbox", { name: /Connected Pilot Specialty/ })
    .check();
  await page
    .getByRole("button", { name: "Update local preview", exact: true })
    .click();
  await page.getByLabel("I offer a free phone consultation").uncheck();
  await mainNav(page, "Home");
  await expect(
    page.getByRole("list", { name: "Browse specialties" }),
  ).toContainText("Connected Inspection Specialists");
  await expect(
    page
      .getByLabel("Professional category")
      .locator('option[value="mold-inspection"]'),
  ).toHaveText("Connected Inspection Specialists");
  await expect(
    page
      .getByLabel("Professional category")
      .locator(`option[value="${addedId}"]`),
  ).toHaveText("Connected Pilot Specialty");
  await page
    .getByRole("list", { name: "Browse specialties" })
    .getByRole("link", { name: /Connected Inspection Specialists/ })
    .click();
  await expect(page).toHaveURL("/directory?category=mold-inspection");
  const result = page
    .locator(".directory-results-section")
    .getByTestId("professional-card");
  await expect(result).toHaveCount(1);
  await expect(result).toContainText("Connected Fern Studio");
  await expect(result).not.toContainText("Free phone consultation");
  await page
    .getByRole("link", {
      name: "View profile for Connected Fern Studio",
      exact: true,
    })
    .click();
  await expect(page.locator("main")).toContainText(
    "Accepted connected profile copy",
  );
  await expect(page.locator("main")).toContainText(
    "Changed fictional credential — not verified",
  );
  await expect(page.locator("main")).not.toContainText("Reviewed credential");
  await expect(
    page.getByRole("heading", { name: "Free phone consultation", exact: true }),
  ).toHaveCount(0);
  await inspect(page, `accepted-profile-${info.project.name}`);
  await mainNav(page, "Pricing");
  await expect(
    page.locator('[data-category-id="mold-inspection"]'),
  ).toContainText("Connected Inspection Specialists");
  await expect(
    page.locator('[data-category-id="mold-inspection"]'),
  ).toContainText("$79");
  await expect(page.locator(`[data-category-id="${addedId}"]`)).toContainText(
    "Provisional demo price",
  );
  await expect(page.locator(`[data-category-id="${addedId}"]`)).toContainText(
    "$123",
  );
  if (info.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 844 });
    await inspect(page, "categories-pricing-320");
  }
  await page.reload();
  await expect(page.locator(`[data-category-id="${addedId}"]`)).toHaveCount(0);
  await expect(
    page.locator('[data-category-id="mold-inspection"]'),
  ).not.toContainText("Connected Inspection Specialists");
});

test("published application updates counts, reviews, member workspace and moderated Q&A attribution", async ({
  page,
}, info) => {
  await page.goto("/list-your-business");
  await fillApplication(page);
  await page.getByLabel("City", { exact: true }).fill("Burlington");
  await page.getByLabel("State (2-letter abbreviation)").fill("VT");
  await page
    .getByRole("button", { name: "Create application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application prepared", exact: true }),
  ).toBeVisible();
  await account(page, "admin");
  await section(page, "Admin", "Applications");
  await review(page, business);
  await decision(page, "approved", "Private application acceptance note");
  await membership(page, business, "active");
  await section(page, "Admin", "Featured");
  await page
    .getByRole("link", { name: `Manage ${business}`, exact: true })
    .click();
  await page.getByLabel("Featured entitlement").selectOption("active");
  await page
    .getByLabel("Scenario note", { exact: true })
    .fill("Private featured example note");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Apply featured scenario" }).click();
  await mainNav(page, "Home");
  await expect(page.getByTestId("home-professional-count")).toHaveText("9");
  await expect(page.getByTestId("home-state-count")).toHaveText("8");
  await expect(
    page.locator(".featured-card").filter({ hasText: business }),
  ).toHaveCount(1);
  await page
    .getByRole("link", { name: `View profile for ${business}`, exact: true })
    .click();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Connected fictional visitor");
  await page.getByLabel("Rating", { exact: true }).selectOption("5");
  await page
    .getByLabel("Written review", { exact: true })
    .fill("A fictional review of the connected application workflow.");
  await page
    .getByRole("button", { name: "Submit review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review pending", exact: true }),
  ).toBeVisible();
  await account(page, "admin");
  await section(page, "Admin", "Reviews");
  await page
    .getByRole("link", {
      name: "Review by Connected fictional visitor",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View Public reviews", exact: true })
    .click();
  await expect(page.getByTestId("review-summary")).toHaveText(
    "5 out of 51 published review",
  );
  await account(page, "application");
  await section(page, "Member", "Reviews");
  await expect(
    page.getByRole("list", { name: "Published reviews" }),
  ).toContainText("Connected fictional visitor");
  await section(page, "Member", "Q&A");
  await page.locator(".qa-list h3 a").first().click();
  await page
    .getByLabel("Answer text", { exact: true })
    .fill(
      "A fictional response showing an accepted application's profile association.",
    );
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await account(page, "admin");
  await section(page, "Admin", "Q&A");
  await page
    .getByRole("navigation", { name: "Q&A queues" })
    .getByRole("link", { name: /^Answers/ })
    .click();
  await page.getByLabel("Publication status").selectOption("pending");
  await page.getByRole("button", { name: "Filter Q&A", exact: true }).click();
  await expect(
    page.getByText("1 matching answers", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: `Review answer by ${business}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish answer", exact: true })
    .click();
  await page
    .getByRole("link", { name: /View public session question/ })
    .click();
  const attribution = page
    .locator(".qa-answer-author")
    .getByRole("link", { name: business, exact: true });
  await expect(attribution).toHaveAttribute(
    "href",
    "/professionals/demo-local-application",
  );
  await attribution.click();
  await inspect(page, `application-profile-${info.project.name}`);
  await expect(page.locator("main")).not.toContainText(
    "session-owner@example.invalid",
  );
  expect(
    await (
      await page.request.get("/professionals/demo-local-application")
    ).text(),
  ).not.toContain(business);
});

test("accepted profile inquiry reaches only its linked member and clears on reset", async ({
  page,
}, info) => {
  await page.goto("/professionals/demo-mold-inspection");
  await page
    .getByRole("button", { name: "Check inquiry", exact: true })
    .click();
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await page.getByLabel("Name", { exact: true }).fill("Fictional inbox sender");
  await page
    .getByLabel("Email", { exact: true })
    .fill("connected-inquiry@example.invalid");
  await page
    .getByLabel("Message", { exact: true })
    .fill("A fictional inquiry intended only for Fern's member inbox.");
  await page
    .getByRole("button", { name: "Check inquiry", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Inquiry saved to demo inbox",
      exact: true,
    }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Check inquiry", exact: true }),
  ).toHaveCount(0);
  await account(page, "approved");
  await section(page, "Member", "Inquiries");
  await expect(page.locator("main")).not.toContainText(
    "connected-inquiry@example.invalid",
  );
  await account(page, "fern");
  await section(page, "Member", "Inquiries");
  await expect(page.locator(".inbox-item-card")).toHaveCount(1);
  await page.locator(".inbox-item-card summary").click();
  await expect(page.locator(".member-inbox")).toContainText(
    "connected-inquiry@example.invalid",
  );
  await inspect(page, `inbox-${info.project.name}`);
  if (info.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 844 });
    await inspect(page, "inbox-320");
  }
  await section(page, "Member", "Overview");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Inquiry saved to demo inbox",
      exact: true,
    }),
  ).toBeVisible();
  await account(page, "fern");
  await resetSession(page);
  await section(page, "Member", "Inquiries");
  await expect(page.locator("main")).not.toContainText(
    "connected-inquiry@example.invalid",
  );
});

test("photo drafts stay private; accepted replacement/removal follows the owning public profile and reload clears media", async ({
  page,
}, info) => {
  await page.goto("/login");
  await signIn(page, "fern");
  await section(page, "Member", "Profile");
  await page.getByLabel("Choose a sample business photo").setInputFiles(sample);
  await expect(page.getByAltText("Local business photo preview")).toBeVisible();
  await section(page, "Member", "Overview");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(page.getByAltText(`Business photo for ${fern}`)).toHaveCount(0);
  await account(page, "builder");
  await section(page, "Member", "Profile");
  await expect(page.getByAltText("Local business photo preview")).toHaveCount(
    0,
  );
  await expect(page.getByAltText("Saved business photo")).toHaveCount(0);
  await account(page, "fern");
  await section(page, "Member", "Profile");
  await expect(page.getByAltText("Local business photo preview")).toHaveCount(
    0,
  );
  await page.getByLabel("Choose a sample business photo").setInputFiles(sample);
  await page
    .getByRole("button", { name: "Save sample photo", exact: true })
    .click();
  await expect(page.getByAltText("Saved business photo")).toBeVisible();
  await section(page, "Member", "Overview");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  const accepted = page.getByAltText(`Business photo for ${fern}`);
  await expect(accepted).toHaveAttribute("src", /^blob:/);
  await expect.poll(() => accepted.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(1);
  const before = await accepted.getAttribute("src");
  await account(page, "builder");
  await section(page, "Member", "Overview");
  await page.getByRole("link", { name: "View public profile", exact: true }).click();
  await expect(page.getByAltText("Business photo for Hearthside Building Co.")).toHaveCount(0);
  await expect(page.getByText("Business photo not provided", { exact: true })).toBeVisible();
  await account(page, "fern");
  await section(page, "Member", "Profile");
  await page
    .getByLabel("Choose a sample business photo")
    .setInputFiles("public/media/demo-home-interior.jpg");
  await expect(page.getByAltText("Local business photo preview")).toBeVisible();
  await page
    .getByRole("button", { name: "Save sample photo", exact: true })
    .click();
  await section(page, "Member", "Overview");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(accepted).toBeVisible();
  await expect(accepted).not.toHaveAttribute("src", before!);
  await expect.poll(() => accepted.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(1);
  await inspect(page, `saved-photo-${info.project.name}`);
  await page
    .locator(".profile-heading")
    .screenshot({
      path: `output/playwright/connected-photo-heading-${info.project.name}.png`,
    });
  if (info.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 844 });
    await inspect(page, "saved-photo-320");
  }
  await account(page, "fern");
  await section(page, "Member", "Profile");
  await page
    .getByRole("button", { name: "Remove saved photo", exact: true })
    .click();
  await section(page, "Member", "Overview");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(accepted).toHaveCount(0);
  await account(page, "fern");
  await section(page, "Member", "Profile");
  await page.getByLabel("Choose a sample business photo").setInputFiles(sample);
  await page
    .getByRole("button", { name: "Save sample photo", exact: true })
    .click();
  await section(page, "Member", "Overview");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(accepted).toBeVisible();
  await page.reload();
  await expect(accepted).toHaveCount(0);
  expect(
    await (
      await page.request.get("/professionals/demo-mold-inspection")
    ).text(),
  ).not.toContain("data:image/");
});

test("resource links retain mouse/touch targets when entrance motion is canceled and remain keyboard accessible", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Freeze a real entrance at a deterministic point, rather than sleeping for a
  // guessed animation duration. The controller still owns the actual animation.
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (this instanceof HTMLElement && this.matches(".resource-card")) {
        animation.pause();
        animation.currentTime = 100;
      }
      return animation;
    };
  });
  await page.goto("/resources");
  const card = page.locator(".resource-card").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-revealed", "true");
  const title = card.locator("h2 a");
  const destination = await title.getAttribute("href");
  const box = await title.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2,
    y = box!.y + box!.height / 2;
  if (info.project.name === "desktop") {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect
      .poll(() => card.evaluate((element) => element.getAnimations().length))
      .toBe(0);
    const held = await title.boundingBox();
    expect(Math.abs(held!.y - box!.y)).toBeLessThan(1);
    await page.mouse.up();
  } else await page.touchscreen.tap(x, y);
  await expect(page).toHaveURL(destination!);
  await page.goBack();
  await page
    .getByRole("link", { name: "Explore a new specialty", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/resources/explore-a-new-specialty");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Explore a new specialty",
  );
});
