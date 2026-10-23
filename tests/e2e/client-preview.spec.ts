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
  const answersQueue = page
    .getByRole("navigation", { name: "Q&A queues" })
    .getByRole("link", { name: /^Answers/ });
  const answersDestination = await answersQueue.getAttribute("href");
  await answersQueue.press("Enter");
  await expect(page).toHaveURL(answersDestination!);
  await expect(answersQueue).toHaveAttribute("aria-current", "page");
  await page.getByLabel("Publication status").selectOption("pending");
  await page
    .getByRole("button", { name: "Filter Q&A", exact: true })
    .press("Enter");
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

test("client revision preserves section order, specialist labels and free consultation copy", async ({
  page,
}) => {
  await page.goto("/");
  const selectors = [
    ".home-hero",
    "#journey-heading",
    "#category-heading",
    "#home-about-heading",
    "#features-heading",
    "#featured-heading",
    "#review-process-heading",
    "#business-heading",
  ];
  const positions: number[] = [];
  for (const selector of selectors)
    positions.push((await page.locator(selector).boundingBox())!.y);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  if (page.viewportSize()!.width <= 1050) {
    const featuredHeader = (await page
      .locator(".featured-header")
      .boundingBox())!;
    expect(featuredHeader.height).toBeLessThan(420);
  }
  await expect(page.locator(".hero-copy")).toContainText(
    "health practitioners who help families heal",
  );
  await expect(page.locator(".hero-copy")).not.toContainText(
    "certified specialist",
  );
  await expect(page.locator(".category-header-sub")).toHaveCount(0);
  await expect(page.locator(".home-features-band")).toContainText(
    "mold-related health issues",
  );
  await expect(page.locator(".home-features-band")).toContainText(
    "Book a free consult",
  );
  await page.goto("/pricing");
  await expect(page.locator("#pricing-consultation-heading")).toHaveCount(0);
  await page.goto("/education");
  await expect(page).toHaveTitle(/Certifications/);
  await expect(page.locator(".education-hero-left")).toContainText(
    "Grow your professional knowledge",
  );
  const heading = (await page.locator(".education-hero h1").boundingBox())!;
  const intro = (await page.locator(".education-intro-below").boundingBox())!;
  expect(intro.y).toBeGreaterThanOrEqual(heading.y + heading.height);
  await page.goto("/professionals/demo-mold-inspection");
  await expect(
    page.getByRole("link", { name: /View city on Google Maps/ }),
  ).toHaveAttribute("href", /api=1&query=Asheville/);
  await expect(
    page.getByRole("heading", { name: "Free phone consultation", exact: true }),
  ).toBeVisible();
});

test("member sample photo and consultation preferences remain local and clear on sign-out", async ({
  page,
}) => {
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") submissions.push(request.method());
  });
  await page.goto("/login");
  await signIn(page, "approved");
  await section(page, "Member", "Profile");
  const participation = page.getByRole("checkbox", {
    name: "I offer a free phone consultation",
  });
  await expect(participation).toBeChecked();
  await participation.uncheck();
  await expect(participation).not.toBeChecked();
  await page.getByLabel("Choose a sample business photo").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("img", { name: "Local business photo preview" }),
  ).toBeVisible();
  await signIn(page, "coordinator");
  await section(page, "Member", "Profile");
  await expect(
    page.getByRole("img", { name: "Local business photo preview" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "I offer a free phone consultation" }),
  ).toBeChecked();
  expect(submissions).toEqual([]);
});

test("builder category inbox receives an approved question and publishes its reviewed first answer", async ({
  page,
}) => {
  test.setTimeout(120000);
  const title = "Fictional builder ventilation planning";
  await page.goto("/questions/ask");
  await page.getByLabel("Question title", { exact: true }).fill(title);
  await page.getByLabel("Relevant category").selectOption("healthy-builders");
  await page
    .getByLabel("Question text", { exact: true })
    .fill(
      "Which fictional ventilation considerations should I discuss when planning a new home?",
    );
  await page
    .getByRole("button", { name: "Submit question", exact: true })
    .click();
  await signIn(page, "admin");
  await section(page, "Admin", "Q&A");
  await page
    .getByRole("link", { name: `Review ${title}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish question", exact: true })
    .click();
  await signIn(page, "approved");
  await section(page, "Member", "Q&A");
  await expect(
    page.getByRole("link", { name: title, exact: true }),
  ).toHaveCount(0);
  await signIn(page, "builder");
  await section(page, "Member", "Q&A");
  await page.getByRole("link", { name: title, exact: true }).click();
  await page
    .getByLabel("Answer text", { exact: true })
    .fill(
      "A fictional builder response explaining useful ventilation planning questions for a new home.",
    );
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await signIn(page, "admin");
  await section(page, "Admin", "Q&A");
  await page
    .getByRole("navigation", { name: "Q&A queues" })
    .getByRole("link", { name: /Answers/ })
    .click();
  await page
    .getByRole("link", {
      name: "Review answer by Hearthside Building Co.",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Publish answer", exact: true })
    .click();
  await page
    .getByRole("link", { name: /View public session question/ })
    .click();
  await expect(page).toHaveURL(/\/questions\/demo-session-question-\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByRole("main")).toContainText(
    "A fictional builder response",
  );
  await expect(page.getByRole("main")).not.toContainText(
    "builder@example.invalid",
  );
  await signIn(page, "builder");
  await section(page, "Member", "Profile");
  await page.getByRole("checkbox", { name: /Healthy Home Designers/ }).check();
  await page.getByRole("checkbox", { name: /Healthy Home Builders/ }).uncheck();
  await page.getByRole("button", { name: "Update local preview" }).click();
  await section(page, "Member", "Q&A");
  const ownAnswers = page.getByRole("region", {
    name: "Your submitted answers",
  });
  await expect(ownAnswers).toContainText(title);
  await expect(ownAnswers).toContainText("Answer status: published");
  await expect(ownAnswers).not.toContainText(
    "The parent question is not public",
  );
});
