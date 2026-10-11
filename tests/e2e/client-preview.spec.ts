import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
  await page.screenshot({
    path: `output/playwright/client-preview-${name}.png`,
    fullPage: true,
  });
}
test("published member answer attribution opens its associated eligible profile", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/login");
  await signIn(page, "fern");
  await section(page, "Member", "Q&A");
  await page.locator(".qa-list h3 a").first().click();
  await page
    .getByLabel("Answer text", { exact: true })
    .fill("A fictional response demonstrating the member attribution layout.");
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .press("Enter");
  await signIn(page, "admin");
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
    .getByRole("link", {
      name: "Review answer by Fern & Field Inspections",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Publish answer", exact: true })
    .press("Enter");
  await page
    .getByRole("link", { name: /View public session question/ })
    .click();
  const attribution = page
    .locator(".qa-answer-author")
    .getByRole("link", { name: "Fern & Field Inspections", exact: true })
    .last();
  await expect(attribution).toHaveAttribute(
    "href",
    "/professionals/demo-mold-inspection",
  );
  await attribution.press("Enter");
  await expect(page).toHaveURL("/professionals/demo-mold-inspection");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fern & Field Inspections",
  );
});
test("sample resources filter, empty states, article navigation and newsletter errors work without subscriptions", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(90000);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Resources", exact: true })
    .press("Enter");
  await expect(page.locator(".resource-card")).toHaveCount(3);
  await inspect(page, `resources-${info.project.name}`);
  await page
    .getByRole("navigation", { name: "Resource categories" })
    .getByRole("link", { name: "For professionals", exact: true })
    .press("Enter");
  await expect(page.locator(".resource-card")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Explore a new specialty", exact: true })
    .press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Explore a new specialty",
  );
  await inspect(page, `article-${info.project.name}`);
  await page
    .getByRole("link", { name: "Back to For professionals" })
    .press("Enter");
  await page
    .getByRole("link", { name: "Community stories", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Stories are still to come" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview signup" }).press("Enter");
  await expect(page.getByLabel("Email address", { exact: true })).toBeFocused();
  await expect(page.locator("#newsletter-error")).toHaveText(
    "Enter a valid email address.",
  );
  await page.getByLabel("Email address", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Preview signup" }).press("Enter");
  await expect(page.locator("#newsletter-error")).toBeVisible();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("sample@example.invalid");
  await page.getByRole("button", { name: "Preview signup" }).press("Enter");
  await expect(page.getByText(/Signup preview complete/)).toBeFocused();
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue(
    "",
  );
  await inspect(page, `newsletter-${info.project.name}`);
  expect(mutations).toEqual([]);
  await page.goto("/resources?category=missing");
  await expect(
    page.getByRole("heading", { name: "Category unavailable" }),
  ).toBeVisible();
  expect((await page.goto("/resources/missing-article"))?.status()).toBe(404);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("/resources");
  await expect(
    staticPage.getByLabel("Email address", { exact: true }),
  ).toBeDisabled();
  await expect(
    staticPage.getByRole("button", { name: "Preview signup" }),
  ).toBeDisabled();
  await context.close();
});
test("preview pages preserve honest badges, pending content, working links and 320px layout", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const route of [
    "/",
    "/pricing",
    "/resources",
    "/resources/prepare-a-project-conversation",
    "/professionals/demo-mold-inspection",
    "/contact",
    "/terms",
    "/privacy",
  ]) {
    await page.goto(route);
    await inspect(
      page,
      `${route.replace(/\W/g, "-") || "home"}-${info.project.name}`,
    );
  }
  await page.goto("/contact");
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(
    page.getByText(/Public contact details are awaiting confirmation/),
  ).toBeVisible();
  await page.goto("/terms");
  await expect(
    page.getByText("Awaiting client approval", { exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Our Review Process", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Featured listing examples",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("professional-card")).toHaveCount(2);
  await page
    .getByRole("link", { name: "View profile for Fern & Field Inspections" })
    .press("Enter");
  await expect(page.locator("main")).toContainText("Reviewed credential");
  await expect(page.locator("main")).toContainText(
    "Business photo not provided",
  );
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Restored Healthy Homes — home", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/");
  if (info.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 844 });
    for (const route of [
      "/",
      "/pricing",
      "/resources",
      "/resources/prepare-a-project-conversation",
      "/contact",
    ]) {
      await page.goto(route);
      await inspect(page, `${route.replace(/\W/g, "-")}-320`);
    }
  }
});
