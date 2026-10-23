import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fillApplication, mainNav } from "./helpers/application";
import { signIn } from "./helpers/demo-sign-in";
import { section, review, decision, resetSession } from "./helpers/dashboard";

test.setTimeout(180000);
const business = "Session Sample Business";
const profilePath = "/professionals/demo-local-application";

async function apply(page: Page) {
  await page.goto("/list-your-business");
  await fillApplication(page);
  await page
    .getByLabel("Services", { exact: true })
    .fill("Sample material selection\nSample planning\nSample planning");
  await page
    .getByLabel("Listed credentials (optional)")
    .fill("Fictional sample course\nFictional sample course");
  await page
    .getByLabel("Business description", { exact: true })
    .fill(
      "A fictional business for the public journey. <script>window.listingInjected=true</script>",
    );
  await page
    .getByLabel("Public professional / owner name (optional)")
    .fill("Public Journey Owner");
  await page
    .getByLabel("Public email (optional)")
    .fill("public-journey@example.invalid");
  await page
    .getByLabel("Phone (optional)", { exact: true })
    .fill("919-555-0123");
  await page
    .getByRole("button", { name: "Create application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Application prepared", exact: true }),
  ).toBeVisible();
}
async function approve(page: Page) {
  await page
    .getByRole("link", { name: "Open member workspace", exact: true })
    .click();
  await signIn(page, "admin");
  await section(page, "Admin", "Applications");
  await review(page, business);
  await decision(page, "approved", "Private application review reason");
}
async function membership(page: Page, status = "active") {
  await signIn(page, "admin");
  await section(page, "Admin", "Membership");
  await page
    .getByRole("link", { name: `Manage ${business}`, exact: true })
    .click();
  await page
    .getByLabel("Simulated membership status", { exact: true })
    .selectOption(status);
  await page
    .getByLabel("Scenario note", { exact: true })
    .fill("Private payment scenario note");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Apply membership scenario", exact: true })
    .click();
  await expect(
    page
      .locator(".workspace-status > div")
      .filter({ has: page.getByText("Subscription", { exact: true }) })
      .locator("dd"),
  ).toHaveText(status);
}
async function find(page: Page, keyword = business) {
  await mainNav(page, "Find Specialists");
  await expect(
    page.getByRole("form", { name: "Directory filters" }),
  ).toHaveAttribute("data-ready", "true");
  await page.getByLabel("Keyword", { exact: true }).fill(keyword);
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/q=/);
}
async function inspect(page: Page, file: string) {
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
    path: `output/playwright/public-listing-${file}.png`,
    fullPage: true,
  });
}

test("application publishes through approval and active membership into searchable full profile; private data stays local", async ({
  page,
  browser,
}, info) => {
  const mutations: string[] = [],
    errors: string[] = [],
    leaked: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
    if (
      /session-owner|Private.application.review|Private.payment.scenario/.test(
        request.url() + request.postData(),
      )
    )
      leaked.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await apply(page);
  await approve(page);
  await find(page);
  await expect(
    page.getByRole("link", {
      name: `View profile for ${business}`,
      exact: true,
    }),
  ).toHaveCount(0);
  await membership(page);
  await page
    .getByRole("link", {
      name: "Find this business in the directory",
      exact: true,
    })
    .click();
  const result = page
    .getByTestId("professional-card")
    .filter({ hasText: business });
  await expect(result).toHaveCount(1);
  await expect(result).toContainText("No published reviews yet");
  await inspect(page, `directory-${info.project.name}`);
  await page
    .getByRole("link", { name: `View profile for ${business}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(business);
  await expect(page.getByRole("main")).toContainText("Public Journey Owner");
  await expect(page.getByRole("main")).toContainText(
    "public-journey@example.invalid",
  );
  await expect(page.getByRole("main")).toContainText("919-555-0123");
  await expect(page.getByRole("main")).toContainText(
    "Sample moisture-aware materials",
  );
  await expect(page.getByRole("main")).toContainText(
    "Fictional sample course — not verified",
  );
  await expect(
    page
      .getByRole("region", { name: "Services", exact: true })
      .getByRole("listitem")
      .filter({ hasText: /^Sample planning$/ }),
  ).toHaveCount(2);
  for (const value of [
    "Fictional Owner",
    "session-owner@example.invalid",
    "Private application review reason",
    "Private payment scenario note",
  ])
    await expect(page.getByRole("main")).not.toContainText(value);
  await expect(page.getByRole("main")).toContainText(
    "<script>window.listingInjected=true</script>",
  );
  expect(await page.evaluate(() => "listingInjected" in window)).toBe(false);
  await inspect(page, `profile-${info.project.name}`);
  const html = await (await page.request.get(profilePath)).text();
  for (const value of [
    business,
    "Public Journey Owner",
    "session-owner@example.invalid",
    "Private application review reason",
    "Private payment scenario note",
  ])
    expect(html).not.toContain(value);
  expect(html).toContain("noindex");
  await page
    .getByRole("link", { name: "Back to results", exact: true })
    .click();
  await expect(result).toHaveCount(1);
  await page.getByLabel("Minimum review rating").selectOption("1");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(result).toHaveCount(0);
  await page.getByLabel("Minimum review rating").selectOption("");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(result).toHaveCount(1);
  await page
    .getByRole("link", { name: `View profile for ${business}`, exact: true })
    .click();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(new URL(profilePath, page.url()).href);
  await expect(
    otherPage.getByRole("heading", {
      name: "Profile unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await other.close();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Profile unavailable", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to directory", exact: true })
    .click();
  await expect(
    page.getByTestId("professional-card").filter({ hasText: business }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(leaked).toEqual([]);
  expect(errors).toEqual([]);
});

test("membership failures, suspension and rejection remove publication; accepted edits and sign-out remain consistent", async ({
  page,
}, info) => {
  await apply(page);
  await approve(page);
  await membership(page);
  await section(page, "Admin", "Listings");
  await review(page, business);
  page.once("dialog", (dialog) => dialog.accept());
  await decision(page, "suspend", "Private suspension reason");
  await membership(page);
  await find(page);
  await expect(
    page.getByTestId("professional-card").filter({ hasText: business }),
  ).toHaveCount(0);
  await signIn(page, "admin");
  await section(page, "Admin", "Listings");
  await review(page, business);
  await decision(page, "reinstate", "Reinstatement reviewed");
  await membership(page, "past_due");
  await find(page);
  await expect(
    page.getByTestId("professional-card").filter({ hasText: business }),
  ).toHaveCount(0);
  await membership(page);
  await section(page, "Admin", "Listings");
  await review(page, business);
  await page.getByText("Edit business profile", { exact: true }).click();
  await page
    .getByLabel("Business description", { exact: true })
    .fill("This unsaved text must not be publicly visible.");
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(page.getByRole("main")).not.toContainText("This unsaved text");
  await signIn(page, "admin");
  await section(page, "Admin", "Listings");
  await review(page, business);
  await page.getByText("Edit business profile", { exact: true }).click();
  await page
    .getByLabel("Business description", { exact: true })
    .fill(
      "Accepted public description from the listing editor. " +
        "A".repeat(1800),
    );
  await page.getByLabel("Public email (optional)").fill("");
  await page
    .getByRole("button", { name: "Save profile changes", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View public profile", exact: true })
    .click();
  await expect(page.getByRole("main")).toContainText(
    "Accepted public description",
  );
  await expect(page.getByRole("main")).not.toContainText(
    "public-journey@example.invalid",
  );
  if (info.project.name === "desktop") {
    await page.setViewportSize({ width: 320, height: 800 });
    const textStyle = await page.addStyleTag({
      content: ".profile-page {font-size: 200%}",
    });
    await inspect(page, "profile-320-enlarged");
    await textStyle.evaluate((element) =>
      element.parentNode?.removeChild(element),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
  await find(page);
  await expect(
    page.getByRole("link", {
      name: `View profile for ${business}`,
      exact: true,
    }),
  ).toHaveCount(1);
  await signIn(page, "admin");
  await section(page, "Admin", "Applications");
  await review(page, business);
  page.once("dialog", (dialog) => dialog.accept());
  await decision(page, "rejected", "Rejected after review");
  await membership(page);
  await find(page);
  await expect(
    page.getByTestId("professional-card").filter({ hasText: business }),
  ).toHaveCount(0);
});

test("created categories propagate to public search and safe profile returns; reset removes local catalog and listing", async ({
  page,
}) => {
  await apply(page);
  await approve(page);
  await section(page, "Admin", "Categories");
  await page.getByLabel("New category name").fill("Public Air Planning");
  await page
    .getByLabel("Category description", { exact: true })
    .fill("A fictional specialty for public journey testing.");
  await page.getByLabel("Preview monthly price (USD)").fill("123");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Category to rename")
      .locator("option")
      .filter({ hasText: "Public Air Planning" }),
  ).toHaveCount(1);
  const categoryId = await page
    .getByLabel("Category to rename")
    .locator("option")
    .filter({ hasText: "Public Air Planning" })
    .getAttribute("value");
  await section(page, "Admin", "Listings");
  await review(page, business);
  await page.getByText("Edit business profile", { exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Healthy Home Designers/ })
    .uncheck();
  await page.getByRole("checkbox", { name: /Healthy Home Trades/ }).uncheck();
  await page.getByRole("checkbox", { name: /Public Air Planning/ }).check();
  await page
    .getByRole("button", { name: "Save profile changes", exact: true })
    .click();
  await membership(page);
  await find(page);
  await page
    .getByLabel("Professional category", { exact: true })
    .selectOption(categoryId!);
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`category=${categoryId}`));
  await expect(
    page.getByTestId("professional-card").filter({ hasText: business }),
  ).toHaveCount(1);
  await page
    .getByRole("link", { name: `View profile for ${business}`, exact: true })
    .click();
  await expect(page.getByRole("main")).toContainText("Public Air Planning");
  await expect(
    page.getByRole("link", { name: "Back to results", exact: true }),
  ).toHaveAttribute("href", new RegExp(`category=${categoryId}`));
  await page
    .getByRole("link", { name: "Back to results", exact: true })
    .click();
  await signIn(page, "admin");
  await resetSession(page);
  await page.goto(`/directory?category=${categoryId}`);
  await expect(
    page.getByRole("heading", { name: "Check your search", exact: true }),
  ).toBeVisible();
  await page.goto(profilePath);
  await expect(
    page.getByRole("heading", { name: "Profile unavailable", exact: true }),
  ).toBeVisible();
});

test("session route is neutral and useful without JavaScript; unrelated hidden IDs remain 404", async ({
  browser,
  request,
}) => {
  for (const id of [
    "not-a-real-profile",
    "demo-pending",
    "member-example-approved",
    "demo-local-application-other",
  ])
    expect((await request.get(`/professionals/${id}`)).status()).toBe(404);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const origin = new URL((await request.get(profilePath)).url()).origin;
  const response = await page.goto(origin + profilePath);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("main")).toContainText(
    "Tab-only profiles require JavaScript",
  );
  await page
    .getByRole("link", { name: "Back to directory", exact: true })
    .click();
  await expect(page.getByTestId("professional-card").first()).toBeVisible();
  await context.close();
});
