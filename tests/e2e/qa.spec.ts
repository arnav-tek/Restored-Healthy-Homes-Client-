import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resetSession } from "./helpers/dashboard";

test("Q&A filters, pagination, history, details and safe return URLs", async ({
  page,
}) => {
  await page.goto("/questions");
  await expect(
    page.getByText("Showing 1–6 of 10 fictional questions"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Next page" }).press("Enter");
  await expect(page).toHaveURL(/questions\?page=2$/);
  await page.reload();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByRole("list").getByRole("link").first().click();
  await expect(
    page.getByRole("heading", { name: /Published sample answers/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Back to questions/ })
    .first()
    .click();
  await expect(page).toHaveURL(/questions\?page=2$/);
  await page.getByLabel("Keyword", { exact: true }).fill("inspection");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("mold-inspection");
  await page
    .getByRole("button", { name: "Search questions", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(
    "/questions?q=inspection&category=mold-inspection",
  );
  await expect(
    page.getByText("Showing 1–2 of 2 fictional questions"),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/page=2$/);
  await expect(page.getByLabel("Keyword", { exact: true })).toHaveValue("");
  await page.goForward();
  await expect(page.getByLabel("Keyword", { exact: true })).toHaveValue(
    "inspection",
  );
  await page.reload();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue(
    "mold-inspection",
  );
  await page.goto("/questions?page=999");
  await expect(page).toHaveURL("/questions?page=2");
  for (const returnTo of [
    "https://evil.invalid",
    "/demo/admin",
    "/questions/ask",
    "/questions?category=unknown",
    "/questions?q=a&q=b",
  ]) {
    await page.goto(
      `/questions/trade-visit?${new URLSearchParams({ returnTo })}`,
    );
    await expect(
      page.getByRole("link", { name: /Back to questions/ }).first(),
    ).toHaveAttribute("href", "/questions");
  }
  await expect(
    page.getByRole("heading", { name: "No published answers yet" }),
  ).toBeVisible();
});

test("Q&A direct routes and payloads exclude unpublished data; attributed profile links work", async ({
  page,
  request,
}) => {
  const forbidden =
    /QA_PRIVATE|QA_UNPUBLISHED|QA_HIDDEN|QA_PUBLISHED_ANSWER_HIDDEN_PARENT|moderationNote/;
  for (const id of [
    "pending-seed-question",
    "rejected-seed-question",
    "missing-question",
    "demo-session-question-1",
  ]) {
    const response = await request.get(`/questions/${id}`);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toMatch(forbidden);
  }
  for (const path of [
    "/questions",
    "/questions?page=2",
    "/questions/planning-inspection",
    "/questions/design-handover",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const html = await response.text();
    expect(html).not.toMatch(forbidden);
    expect(html).not.toContain("application/ld+json");
  }
  const payloads: Promise<string>[] = [];
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "script" ||
      response.headers()["content-type"]?.includes("text/x-component")
    )
      payloads.push(response.text().catch(() => ""));
  });
  await page.goto("/questions/planning-inspection");
  await expect(
    page.getByRole("heading", { name: "Published sample answers (2)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View fictional professional profile" }),
  ).toHaveCount(1);
  await page
    .getByRole("link", { name: "View fictional professional profile" })
    .click();
  await expect(page).toHaveURL(/professionals\/demo-mold-inspection$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Fern & Field",
  );
  await page.goto("/questions/design-handover");
  await expect(
    page.getByRole("link", { name: "View fictional professional profile" }),
  ).toHaveCount(0);
  expect((await Promise.all(payloads)).join("\n")).not.toMatch(forbidden);
});

test("question validation, shared drafts, pending confirmation and confirmed reset have no side effects", async ({
  page,
}, testInfo) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  await page.goto("/questions/ask");
  await page
    .getByRole("button", { name: "Submit demo question" })
    .press("Enter");
  await expect(
    page.getByLabel("Question title", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Use a title of 10–160 characters."),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/phase-2e1-validation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByLabel("Question title", { exact: true })
    .fill("A fictional materials planning question");
  await page.getByLabel("Relevant category").selectOption("healthy-designers");
  await page
    .getByLabel("Question text", { exact: true })
    .fill(
      "What documents might a fictional design team include in a materials schedule?",
    );
  await page
    .getByRole("link", { name: "Back to questions", exact: true })
    .click();
  await page.getByLabel("Keyword", { exact: true }).fill("materials");
  await page
    .getByRole("button", { name: "Search questions", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Ask a demo question", exact: true })
    .click();
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "A fictional materials planning question",
  );
  await resetSession(page, false);
  await expect(
    page.getByLabel("Question text", { exact: true }),
  ).not.toHaveValue("");
  await page.getByRole("button", { name: "Submit demo question" }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting fictional review" }),
  ).toBeFocused();
  await expect(
    page.getByText(/not publicly visible, has not been sent to professionals/),
  ).toBeVisible();
  await expect(page.locator(".qa-confirmation a")).toHaveCount(0);
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
    path: `output/playwright/phase-2e1-confirmation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Back to questions", exact: true })
    .click();
  await page
    .getByLabel("Keyword", { exact: true })
    .fill("A fictional materials planning question");
  await page
    .getByRole("button", { name: "Search questions", exact: true })
    .click();
  await expect(page.getByText("0 matching fictional questions")).toBeVisible();
  await page
    .getByRole("link", { name: "Ask a demo question", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Awaiting fictional review" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ask another demo question" }).click();
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Question title", { exact: true })
    .fill("Reset clears this draft");
  await resetSession(page);
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Question title", { exact: true })
    .fill("Refresh clears this draft");
  await page.reload();
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Question title", { exact: true })
    .fill("A temporary fictional question");
  await page.getByLabel("Relevant category").selectOption("healthy-designers");
  await page
    .getByLabel("Question text", { exact: true })
    .fill(
      "What could a fictional materials schedule include for a sample home project?",
    );
  await page.getByRole("button", { name: "Submit demo question" }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting fictional review" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("heading", { name: "Awaiting fictional review" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(page.url()).not.toContain("draft");
});

test("Q&A screens handle long titles, errors, empty states and accessible navigation", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.press("Enter");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Ask a Specialist", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/questions");
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 900, height: 1000 });
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(900);
    await page.screenshot({
      path: "output/playwright/phase-2e1-navigation-900.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  for (const [name, path] of [
    ["list", "/questions"],
    ["detail", "/questions/design-library"],
    ["answers", "/questions/planning-inspection"],
    ["unanswered", "/questions/trade-visit"],
    ["empty", "/questions?q=absent-example"],
    ["query-error", "/questions?category=unknown&page=0"],
    ["form", "/questions/ask"],
  ]) {
    await page.goto(path);
    if (name === "form")
      await page.getByRole("button", { name: "Submit demo question" }).click();
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
      path: `output/playwright/phase-2e1-${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  await page.goto("http://127.0.0.1:3101/questions");
  await expect(
    page.getByRole("heading", { name: "Questions are unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Retry question search" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("without JavaScript seeded Q&A is readable and question submission is disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  await page.goto("/questions");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("healthy-designers");
  await page
    .getByRole("button", { name: "Search questions", exact: true })
    .click();
  await expect(
    page.getByText("Showing 1–2 of 2 fictional questions"),
  ).toBeVisible();
  await page.getByRole("list").getByRole("link").first().click();
  await expect(
    page.getByRole("heading", { name: /Published sample answers/ }),
  ).toBeVisible();
  await page.goto("/questions/ask");
  await expect(
    page.getByLabel("Question title", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Submit demo question" }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Submission is disabled and no submission endpoint exists/),
  ).toBeVisible();
  expect(mutations).toEqual([]);
  await context.close();
});
