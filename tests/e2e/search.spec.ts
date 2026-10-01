import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage keyboard search to results, reload, radius and nearest-first", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByLabel("Professional category").locator("option"),
  ).toHaveCount(9);
  await page.getByLabel("City or ZIP code").fill("27601");
  await page.getByLabel("Professional category").selectOption("healthy-trades");
  await page
    .getByRole("button", { name: "Search", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/category=healthy-trades&location=27601$/);
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Willow Home Trades" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("City or ZIP code")).toHaveValue("27601");
  await expect(page.getByLabel("Professional category")).toHaveValue(
    "healthy-trades",
  );
  await page.getByLabel("Professional category").selectOption("");
  await page.getByLabel("Radius in miles (optional)").fill("250");
  await page.getByLabel("Sort results").selectOption("nearest");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByTestId("professional-card")).toHaveCount(3);
  await expect(page.getByTestId("professional-card").first()).toContainText(
    "Willow Home Trades",
  );
  await expect(
    page.getByText("Showing 1–3 of 3 sample professionals"),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `output/playwright/search-results-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goBack();
  await expect(page.getByLabel("Professional category")).toHaveValue(
    "healthy-trades",
  );
  await page.goForward();
  await expect(page.getByLabel("Radius in miles (optional)")).toHaveValue(
    "250",
  );
  await expect(page.getByLabel("Sort results")).toHaveValue("nearest");
});

test("pagination preserves query, filter submit resets page, out-of-range page clamps", async ({
  page,
}) => {
  await page.goto("/directory?sort=za");
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  await page.getByRole("link", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/sort=za&page=2$/);
  await expect(page.getByTestId("professional-card")).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByText("Showing 7–8 of 8 sample professionals"),
  ).toBeVisible();
  await page.getByLabel("Keyword", { exact: true }).fill("mold sampling");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=mold\+sampling&sort=za$/);
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/page=2$/);
  await expect(page.getByLabel("Keyword", { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page).toHaveURL(/\/directory$/);
  await expect(page.getByLabel("Sort results")).toHaveValue("az");
  await page.goto("/directory?page=9999");
  await expect(page).toHaveURL(/page=2$/);
});

test("unsupported, ambiguous, malformed and zero-result searches stay honest", async ({
  page,
}, testInfo) => {
  await page.goto("/directory?location=99999");
  await expect(
    page.getByRole("heading", { name: "Check your search" }),
  ).toBeVisible();
  await expect(page.getByLabel("City or ZIP code")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByTestId("professional-card")).toHaveCount(0);
  await page.goto("/directory?location=Portland");
  await expect(
    page.getByRole("link", { name: "Search Portland, OR", exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `output/playwright/search-error-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Search Portland, OR", exact: true })
    .click();
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
  for (const query of [
    "radius=0&location=Raleigh",
    "radius=50",
    "sort=nearest",
    "q=one&q=two",
    "page=-1",
  ]) {
    await page.goto(`/directory?${query}`);
    await expect(
      page.getByRole("heading", { name: "Check your search" }),
    ).toBeVisible();
    await expect(page.getByTestId("professional-card")).toHaveCount(0);
  }
  await page.goto("/directory?q=unfindable");
  await expect(
    page.getByRole("heading", { name: "No matching professionals" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse all professionals" }).click();
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  await page.goto("http://127.0.0.1:3101/directory?q=mold&location=28801");
  await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/directory?q=mold&location=28801",
  );
});

test("search form remains functional without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/");
    await page.getByLabel("City or ZIP code").fill("78701");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Cedar Path Remediation" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
