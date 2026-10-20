import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/demo-sign-in";

async function checkFooter(page: Page) {
  const footer = page.getByRole("contentinfo");
  // Deferred signup must not collect addresses or fall back to a native GET.
  await expect(footer.locator("form, input[type=email]")).toHaveCount(0);
  await expect(footer.getByRole("button", { name: /subscrib/i })).toHaveCount(
    0,
  );
  await expect(
    footer.locator(
      'a[href^="https://instagram.com"], a[href^="https://linkedin.com"], a[href^="https://facebook.com"]',
    ),
  ).toHaveCount(0);
  await expect(
    footer.getByRole("link", { name: "Explore the directory" }),
  ).toHaveAttribute("href", "/directory");
}

test("footer has working navigation without deferred signup or placeholder social links", async ({
  page,
}, info) => {
  await page.goto("/about");
  await checkFooter(page);
  const footer = page.getByRole("contentinfo");
  expect(
    (
      await new AxeBuilder({ page })
        .include("footer")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await footer.screenshot({
    path: `output/playwright/audit-fix-footer-${info.project.name}.png`,
  });
  await footer
    .getByRole("link", { name: "Explore the directory" })
    .press("Enter");
  await expect(page).toHaveURL("/directory");
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
});

test("enhanced top sorting resets pagination, preserves filters/history and retains the signed-in tab", async ({
  page,
}) => {
  await page.goto("/login");
  await signIn(page, "admin");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Find Specialists", exact: true })
    .press("Enter");
  await page
    .getByRole("link", { name: "Next page", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/directory?page=2");
  await expect(
    page.getByRole("button", { name: "Apply sort", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Sort by", { exact: true }).selectOption("za");
  await expect(page).toHaveURL("/directory?sort=za");
  await expect(page.locator(".business-name").first()).toHaveText(
    "Willow Home Trades",
  );
  await expect(page.locator("[data-demo-account]")).toHaveAttribute(
    "data-demo-account",
    "admin",
  );
  await page.goBack();
  await expect(page).toHaveURL("/directory?page=2");
  await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue("az");
  await page.getByLabel("Keyword", { exact: true }).fill("moisture");
  await page
    .getByLabel("Professional category")
    .selectOption("mold-inspection");
  await page.getByLabel("City or ZIP code").fill("27601");
  await page.getByLabel("State", { exact: true }).selectOption("NC");
  await page.getByLabel("Minimum review rating").selectOption("4");
  await page.getByLabel("Radius in miles (optional)").fill("250");
  await page.getByRole("button", { name: "Apply filters" }).press("Enter");
  const filters =
    "q=moisture&category=mold-inspection&location=27601&state=NC&minRating=4&radius=250";
  await expect(page).toHaveURL(`/directory?${filters}`);
  await page.getByLabel("Sort by", { exact: true }).selectOption("za");
  await expect(page).toHaveURL(`/directory?${filters}&sort=za`);
  await expect(page.locator(".business-name")).toHaveText([
    "Fern & Field Inspections",
  ]);
  await expect(page.locator("[data-demo-account]")).toHaveAttribute(
    "data-demo-account",
    "admin",
  );
});

for (const mode of ["no-script", "scripts-blocked"] as const) {
  test(`native top sorting preserves filters and works with ${mode}`, async ({
    browser,
    baseURL,
    viewport,
  }, info) => {
    const context = await browser.newContext({
      baseURL,
      viewport,
      javaScriptEnabled: mode !== "no-script",
    });
    try {
      if (mode === "scripts-blocked")
        await context.route("**/*.js*", (route) => route.abort());
      const page = await context.newPage();
      await page.goto("/directory?page=2");
      await checkFooter(page);
      await page.getByLabel("Sort by", { exact: true }).selectOption("za");
      await page
        .getByRole("button", { name: "Apply sort", exact: true })
        .press("Enter");
      await expect(page).toHaveURL("/directory?sort=za");
      await expect(page.locator(".business-name").first()).toHaveText(
        "Willow Home Trades",
      );
      await expect(page.getByTestId("professional-card")).toHaveCount(6);
      const filters =
        "q=moisture&category=mold-inspection&location=27601&state=NC&minRating=4&radius=250";
      await page.goto(`/directory?${filters}`);
      await page.getByLabel("Sort by", { exact: true }).selectOption("za");
      await page
        .getByRole("button", { name: "Apply sort", exact: true })
        .press("Enter");
      await expect(page).toHaveURL(`/directory?${filters}&sort=za`);
      await expect(page.locator(".business-name")).toHaveText([
        "Fern & Field Inspections",
      ]);
      await page.getByLabel("Sort by", { exact: true }).selectOption("az");
      await page
        .getByRole("button", { name: "Apply sort", exact: true })
        .press("Enter");
      await expect(page).toHaveURL(`/directory?${filters}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport!.width);
      await page.screenshot({
        path: `output/playwright/audit-fix-sort-${mode}-${info.project.name}.png`,
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });
}
