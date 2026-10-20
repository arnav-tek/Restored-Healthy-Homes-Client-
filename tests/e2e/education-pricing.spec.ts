import { previewUrl } from "./helpers/preview-url";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { categories, formatMonthlyPrice } from "../../src/domain/categories";
import { mainNav } from "./helpers/application";
import { signIn } from "./helpers/demo-sign-in";

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
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/phase-2h2-${name}.png`,
    fullPage: true,
  });
}

test("education has eight keyboard pathways, official references and working application links", async ({
  page,
}, info) => {
  await page.goto("/");
  await mainNav(page, "Certifications");
  await expect(page).toHaveURL(/\/education$/);
  await expect(page).toHaveTitle(/Certifications \| Restored Healthy Homes/);
  await expect(page.getByRole("main")).toContainText(
    "we do not train or certify",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Education categories" })
      .getByRole("link"),
  ).toHaveCount(8);
  for (const category of categories) {
    const details = page.locator(`#pathway-${category.id}`);
    await page
      .getByRole("navigation", { name: "Education categories" })
      .getByRole("link", { name: category.name, exact: true })
      .press("Enter");
    await expect(page).toHaveURL(new RegExp(`#pathway-${category.id}$`));
    await details.locator("summary").press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details).toContainText("To be confirmed");
    await expect(details.locator('a[rel="external"]')).toHaveAttribute(
      "href",
      /^https:\/\//,
    );
    await expect(
      details.getByRole("link", { name: /^Apply to list your business/ }),
    ).toHaveAttribute("href", "/list-your-business");
    if (category.id !== "mold-inspection")
      await details.locator("summary").press("Enter");
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await inspect(page, `education-${info.project.name}`);
  await page
    .locator("#pathway-mold-inspection")
    .getByRole("link", { name: /^Apply to list your business/ })
    .press("Enter");
  await expect(page).toHaveURL(/\/list-your-business$/);
  await expect(
    page.getByRole("heading", { name: "List Your Business", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "Application delivery is not connected yet.",
  );
});

test("pricing renders exact catalog prices, full names and truthful membership/application guidance", async ({
  page,
}, info) => {
  await page.goto("/education");
  await mainNav(page, "Pricing");
  await expect(page).toHaveTitle(/Membership Pricing/);
  await expect(page.locator(".membership-table tbody tr")).toHaveCount(8);
  for (const category of categories) {
    const row = page.locator(`[data-category-id="${category.id}"]`);
    await expect(row.getByRole("rowheader")).toContainText(category.name);
    await expect(row.locator("td strong")).toHaveText(
      formatMonthlyPrice(category.monthlyUsd),
    );
    await expect(row.locator("td")).toContainText("USD / month");
    await expect(row.getByRole("link")).toHaveAttribute(
      "href",
      "/list-your-business",
    );
  }
  await expect(page.getByRole("main")).toContainText(
    "admin approval, active membership",
  );
  await expect(page.getByRole("main")).toContainText(
    "Multi-category pricing is pending confirmation",
  );
  await expect(page.getByRole("main")).toContainText("No payment is collected");
  await inspect(page, `pricing-${info.project.name}`);
  await page
    .locator(".membership-table")
    .getByRole("link")
    .first()
    .press("Enter");
  await expect(page).toHaveURL(/\/list-your-business$/);
});

test("new navigation works signed in as professional and admin without changing identity", async ({
  page,
}, info) => {
  for (const account of ["approved", "admin"]) {
    await page.goto("/login");
    await signIn(page, account);
    for (const link of ["Certifications", "Pricing"]) {
      await mainNav(page, link);
      await expect(page.locator("[data-demo-account]")).toHaveAttribute(
        "data-demo-account",
        account,
      );
      await inspect(
        page,
        `${account}-${link.toLowerCase()}-${info.project.name}`,
      );
    }
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Certifications", exact: true }),
    ).toHaveAttribute("href", "/education");
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Membership pricing" }),
    ).toHaveAttribute("href", "/pricing");
  }
});

test("320px reflow, breakpoint menu and server content without JavaScript", async ({
  page,
  browser,
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "Explicit viewports run once");
  for (const width of [1359, 1360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["education", "pricing"]) {
      await page.goto(`/${route}`);
      if (route === "education")
        await page.locator("summary").first().press("Enter");
      await inspect(page, `${route}-${width}`);
    }
    await mainNav(page, "Certifications");
    await mainNav(page, "Pricing");
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 844 },
  });
  const noJs = await context.newPage();
  await noJs.goto(previewUrl("/education"));
  await noJs.locator("summary").first().press("Enter");
  await expect(noJs.locator("details").first()).toHaveAttribute("open", "");
  await noJs
    .getByRole("contentinfo")
    .getByRole("link", { name: "Membership pricing" })
    .press("Enter");
  await expect(noJs.locator(".membership-table tbody tr")).toHaveCount(8);
  await noJs
    .locator(".membership-table")
    .getByRole("link")
    .first()
    .press("Enter");
  await expect(noJs).toHaveURL(/\/list-your-business$/);
  await context.close();
  for (const route of ["/education", "/pricing"]) {
    const response = await request.get(route);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(await response.text()).not.toMatch(
      /privateContact|synthetic-customer|REVIEW_PRIVATE_NOTE/,
    );
  }
});
