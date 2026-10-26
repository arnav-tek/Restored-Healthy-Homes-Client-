import { previewUrl } from "./helpers/preview-url";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/demo-sign-in";
import { section } from "./helpers/dashboard";

test("state and rating filters preserve URL/history/profile returns and accessible card summaries", async ({
  page,
}, info) => {
  await page.goto("/directory");
  await page.getByLabel("State", { exact: true }).selectOption("NC");
  await page.getByLabel("Minimum review rating").selectOption("4.5");
  await page.getByRole("button", { name: "Apply filters" }).press("Enter");
  await expect(page).toHaveURL("/directory?state=NC&minRating=4.5");
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
  await expect(page.getByTestId("card-review-summary")).toContainText(
    "4.5 out of 5",
  );
  await expect(page.getByTestId("card-review-summary")).toContainText(
    "4 published reviews",
  );
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
    path: `output/playwright/directory-ratings-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "View profile for Fern & Field Inspections" })
    .press("Enter");
  await expect(page.getByTestId("review-summary")).toContainText(
    "4.5 out of 5",
  );
  await page
    .getByRole("link", { name: "Back to results", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/directory?state=NC&minRating=4.5");
  await page.getByLabel("Minimum review rating").selectOption("");
  await page.getByRole("button", { name: "Apply filters" }).press("Enter");
  await expect(page).toHaveURL("/directory?state=NC");
  await expect(page.getByTestId("professional-card")).toHaveCount(2);
  await page.goBack();
  await expect(page.getByLabel("Minimum review rating")).toHaveValue("4.5");
  await page.goForward();
  await expect(page.getByLabel("Minimum review rating")).toHaveValue("");
  await page.reload();
  await expect(page.getByLabel("State", { exact: true })).toHaveValue("NC");
  await page
    .getByRole("link", { name: "Clear filters", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/directory");
  await expect(page.getByLabel("State", { exact: true })).toHaveValue("");
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  await expect(
    page
      .getByTestId("professional-card")
      .filter({ hasText: "Cedar Path Remediation" }),
  ).toContainText("No published reviews yet");
});

test("state/rating filters combine with radius/category and reject malformed URLs without fallback results", async ({
  page,
}) => {
  await page.goto(
    "/directory?location=27601&state=NC&minRating=4&radius=250&sort=nearest",
  );
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
  await expect(page.getByTestId("professional-card")).toContainText(
    "Fern & Field Inspections",
  );
  await page.getByLabel("State", { exact: true }).selectOption("TX");
  await page.getByRole("button", { name: "Apply filters" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "No matching professionals" }),
  ).toBeVisible();
  for (const query of [
    "state=XX",
    "state=NC&state=TX",
    "minRating=4.6",
    "minRating=4&minRating=5",
  ]) {
    await page.goto(`/directory?${query}`);
    await expect(
      page.getByRole("heading", { name: "Check your search" }),
    ).toBeVisible();
    await expect(page.getByTestId("professional-card")).toHaveCount(0);
    await expect(
      page.getByLabel(
        query.startsWith("state") ? "State" : "Minimum review rating",
        { exact: true },
      ),
    ).toHaveAttribute("aria-invalid", "true");
  }
  await page.goto("/directory?state=nc&minRating=4.5&page=9999");
  await expect(page).toHaveURL("/directory?state=NC&minRating=4.5");
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
  await page.getByLabel("Professional category").selectOption("healthy-trades");
  await page.getByRole("button", { name: "Apply filters" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "No matching professionals" }),
  ).toBeVisible();
});

test("moderation updates directory card averages and threshold results in the same tab; reload restores seed", async ({
  page,
}) => {
  await page.goto("/demo/admin?section=reviews");
  await signIn(page, "admin");
  await section(page, "Admin", "Reviews");
  await page
    .getByRole("link", { name: "Review by Visitor Alex", exact: true })
    .press("Enter");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reject review", exact: true })
    .press("Enter");
  await expect(page.getByTestId("moderation-review-status")).toHaveText(
    "rejected",
  );
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Find Specialists", exact: true })
    .press("Enter");
  await page.getByLabel("State", { exact: true }).selectOption("NC");
  await page.getByLabel("Minimum review rating").selectOption("4.5");
  await page.getByRole("button", { name: "Apply filters" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "No matching professionals" }),
  ).toBeVisible();
  await page.getByLabel("Minimum review rating").selectOption("4");
  await page.getByRole("button", { name: "Apply filters" }).press("Enter");
  await expect(page.getByTestId("card-review-summary")).toContainText(
    "4.3 out of 5",
  );
  await expect(page.getByTestId("card-review-summary")).toContainText(
    "3 published reviews",
  );
  await page.reload();
  await expect(page.getByTestId("card-review-summary")).toContainText(
    "4.5 out of 5",
  );
  await expect(page.getByTestId("card-review-summary")).toContainText(
    "4 published reviews",
  );
});

test("state/rating search and seed summaries work without JavaScript, with private fixtures excluded", async ({
  browser,
  request,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Explicit no-script context runs once",
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(previewUrl("/directory"));
    await page.getByLabel("State", { exact: true }).selectOption("NC");
    await page.getByLabel("Minimum review rating").selectOption("4.5");
    await page.getByRole("button", { name: "Apply filters" }).press("Enter");
    await expect(page).toHaveURL(/state=NC&minRating=4.5$/);
    await expect(page.getByTestId("professional-card")).toHaveCount(1);
    await expect(page.getByTestId("card-review-summary")).toContainText(
      "4.5 out of 5",
    );
  } finally {
    await context.close();
  }
  const html = await (await request.get("/directory?minRating=4")).text();
  for (const privateText of [
    "REVIEW_HIDDEN",
    "REVIEW_PRIVATE",
    "review-private@example.invalid",
    "internalNotes",
    "customerId",
  ])
    expect(html).not.toContain(privateText);
});

test("directory filters and ratings reflow at 320px and doubled text size", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Explicit narrow/text context runs once",
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/directory?minRating=3");
  await page.evaluate(() => {
    const elements = [
      ...document.querySelectorAll<HTMLElement>(
        "body, h1, h2, h3, p, span, a, button, label, input, select, summary, li",
      ),
    ];
    const sizes = elements.map((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach((element, index) => {
      element.style.fontSize = `${sizes[index] * 2}px`;
    });
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await expect(page.getByLabel("Minimum review rating")).toBeVisible();
  await expect(page.getByTestId("card-review-summary")).toHaveCount(3);
  for (const text of await page
    .locator(".directory-title, .business-name, .card-top .category-pill")
    .all()) {
    expect(
      await text.evaluate((element) => element.scrollWidth),
    ).toBeLessThanOrEqual(
      await text.evaluate((element) => element.clientWidth),
    );
  }
  await page.screenshot({
    path: "output/playwright/directory-ratings-320-text.png",
    fullPage: true,
  });
});
