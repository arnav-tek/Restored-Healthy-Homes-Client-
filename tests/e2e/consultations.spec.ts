import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resetSession } from "./helpers/dashboard";
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
    path: `output/playwright/phase-2f1-${name}.png`,
    fullPage: true,
  });
}
test("consultation navigation and responsive page keep the proposed offer and demo boundary clear", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Have a specific project in mind?" }),
  ).toBeVisible();
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.press("Enter");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Consultations", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/consultations");
  await expect(
    page.getByText("$50 USD / 15 minutes", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Submitting does not confirm an appointment or charge money/,
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Try a demo request", exact: true })
    .click();
  await expect(page).toHaveURL("/consultations#request");
  await inspect(page, `page-${testInfo.project.name}`);
  if (testInfo.project.name === "desktop") {
    for (const width of [1181, 1100]) {
      await page.setViewportSize({ width, height: 1000 });
      await inspect(page, `navigation-${width}`);
    }
  }
});
test("consultation validation, drafts, requested confirmation, another request and shared reset have no side effects", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/consultations");
  await page
    .getByRole("button", { name: "Record demo request" })
    .press("Enter");
  await expect(page.getByLabel("Name (sample)", { exact: true })).toBeFocused();
  await expect(
    page.getByText(
      "Check the highlighted fields. No request has been recorded.",
    ),
  ).toBeVisible();
  await inspect(page, `validation-${testInfo.project.name}`);
  await page
    .getByLabel("Name (sample)", { exact: true })
    .fill("Sample Requester");
  await page.getByLabel("Email (sample)", { exact: true }).fill("bad-address");
  await page.getByRole("button", { name: "Record demo request" }).click();
  await expect(
    page.getByLabel("Email (sample)", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Email (sample)", { exact: true })
    .fill("requester@example.invalid");
  await page
    .getByLabel("Professional category", { exact: true })
    .selectOption("healthy-designers");
  await page
    .getByLabel("Preferred format", { exact: true })
    .selectOption("video");
  await page
    .getByLabel("Question or topic (sample)", { exact: true })
    .fill(
      "CONSULTATION_PRIVATE_SAMPLE: A fictional topic <script>alert('sample')</script>.",
    );
  await page
    .getByRole("link", { name: "Explore public Q&A", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ask a Specialist", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    "CONSULTATION_PRIVATE_SAMPLE",
  );
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Consultations", exact: true })
    .click();
  await expect(page.getByLabel("Name (sample)", { exact: true })).toHaveValue(
    "Sample Requester",
  );
  await expect(
    page.getByLabel("Question or topic (sample)", { exact: true }),
  ).toHaveValue(/CONSULTATION_PRIVATE_SAMPLE/);
  await resetSession(page, false);
  await expect(page.getByLabel("Email (sample)", { exact: true })).toHaveValue(
    "requester@example.invalid",
  );
  await page.getByRole("button", { name: "Record demo request" }).click();
  await expect(
    page.getByRole("heading", { name: "Demo request recorded" }),
  ).toBeFocused();
  await expect(
    page.getByText(
      "No appointment is booked, no specialist has been assigned, no payment was taken and no message was sent.",
    ),
  ).toBeVisible();
  await expect(page.locator(".consultation-summary")).toContainText(
    "Healthy Home Designers",
  );
  await expect(page.locator(".consultation-summary")).toContainText("Video");
  await expect(page.locator(".consultation-summary")).toContainText(
    "$50 USD / 15 minutes",
  );
  await expect(
    page.getByRole("button", { name: "Record demo request" }),
  ).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(
    "requester@example.invalid",
  );
  await expect(page.locator("main")).not.toContainText(
    "CONSULTATION_PRIVATE_SAMPLE",
  );
  expect(new URL(page.url()).search).toBe("");
  await inspect(page, `confirmation-${testInfo.project.name}`);
  await page
    .getByRole("link", { name: "Explore public Q&A", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ask a Specialist", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Demo request recorded" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Make another demo request" }).click();
  await expect(page.getByLabel("Name (sample)", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Email (sample)", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Question or topic (sample)", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Name (sample)", { exact: true })
    .fill("Another Sample");
  await page
    .getByLabel("Email (sample)", { exact: true })
    .fill("another@example.invalid");
  await page
    .getByLabel("Professional category", { exact: true })
    .selectOption("healthy-trades");
  await page
    .getByLabel("Preferred format", { exact: true })
    .selectOption("no-preference");
  await page
    .getByLabel("Question or topic (sample)", { exact: true })
    .fill("A second fictional request about a sample project plan.");
  await page.getByRole("button", { name: "Record demo request" }).click();
  await expect(
    page.getByRole("heading", { name: "Demo request recorded" }),
  ).toBeVisible();
  await resetSession(page, false);
  await expect(
    page.getByRole("heading", { name: "Demo request recorded" }),
  ).toBeVisible();
  await resetSession(page);
  await expect(page.getByLabel("Name (sample)", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Name (sample)", { exact: true })
    .fill("Refresh clears this draft");
  await page.reload();
  await expect(page.getByLabel("Name (sample)", { exact: true })).toHaveValue(
    "",
  );
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page
    .getByLabel("Name (sample)", { exact: true })
    .fill("Refresh Request");
  await page
    .getByLabel("Email (sample)", { exact: true })
    .fill("refresh@example.invalid");
  await page
    .getByLabel("Professional category", { exact: true })
    .selectOption("healthy-designers");
  await page
    .getByLabel("Preferred format", { exact: true })
    .selectOption("phone");
  await page
    .getByLabel("Question or topic (sample)", { exact: true })
    .fill("A temporary fictional request to check the refresh boundary.");
  await page.getByRole("button", { name: "Record demo request" }).click();
  await expect(
    page.getByRole("heading", { name: "Demo request recorded" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name (sample)", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("heading", { name: "Demo request recorded" }),
  ).toHaveCount(0);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
test("consultations remain public-data-free and cannot submit before hydration or without JavaScript", async ({
  browser,
  request,
}) => {
  const response = await request.get(
    "/consultations?email=URL_POISON&topic=URL_POISON",
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  await page.goto("/consultations");
  await expect(
    page.getByLabel("Name (sample)", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Record demo request" }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Submission is disabled; no submission endpoint exists/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The intended workflow" }),
  ).toBeVisible();
  expect(mutations).toEqual([]);
  await context.close();
  const delayed = await browser.newContext();
  await delayed.route("**/*.js*", (route) => route.abort());
  const waiting = await delayed.newPage();
  await waiting.goto("/consultations");
  await expect(
    waiting.getByRole("button", { name: "Record demo request" }),
  ).toBeDisabled();
  await expect(
    waiting.getByLabel("Question or topic (sample)", { exact: true }),
  ).toBeDisabled();
  await delayed.close();
});
