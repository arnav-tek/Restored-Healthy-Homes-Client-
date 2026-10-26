import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mainNav, fillApplication } from "./helpers/application";
import { signIn, visitWorkspace } from "./helpers/demo-sign-in";
import { section, review, decision, resetSession } from "./helpers/dashboard";
import { previewUrl } from "./helpers/preview-url";

test.setTimeout(180000);
const business = "Session Sample Business";
const featured = (page: Page, name: string) =>
  page
    .locator(".featured-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
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
    path: `output/playwright/featured-billing-${name}.png`,
    fullPage: true,
  });
}
async function feature(page: Page, name: string, enabled: boolean) {
  await section(page, "Admin", "Featured");
  await page.getByRole("link", { name: `Manage ${name}`, exact: true }).click();
  await page
    .getByLabel("Featured entitlement", { exact: true })
    .selectOption(enabled ? "active" : "none");
  await page
    .getByLabel("Scenario note", { exact: true })
    .fill("Private featured scenario note");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Apply featured scenario", exact: true })
    .click();
  await expect(
    page.getByLabel("Featured entitlement", { exact: true }),
  ).toHaveValue(enabled ? "active" : "none");
}
async function memberBilling(page: Page, account: string) {
  await signIn(page, account);
  await section(page, "Member", "Membership");
  await expect(page.getByTestId("billing-demo")).toBeVisible();
}
async function outcome(page: Page, success: boolean) {
  await page
    .getByRole("button", {
      name: success ? "Simulate successful payment" : "Simulate failed payment",
      exact: true,
    })
    .press("Enter");
  await expect(
    page.getByRole("heading", {
      name: success
        ? "Simulated membership active"
        : "Simulated payment failed",
      exact: true,
    }),
  ).toBeFocused();
  await expect(page.getByTestId("billing-status")).toHaveText(
    success ? "active" : "past_due",
  );
}
async function prepare(page: Page) {
  await page.goto("/list-your-business");
  await fillApplication(page);
  await page
    .getByRole("button", { name: "Create application", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Open member workspace", exact: true })
    .click();
  await signIn(page, "admin");
  await section(page, "Admin", "Applications");
  await review(page, business);
  await decision(page, "approved", "Private approval scenario note");
  await feature(page, business, true);
}

test("admin featured changes reach homepage through public links and eligibility gates", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".featured-business-name")).toHaveText([
    "Fern & Field Inspections",
    "Softwood Design Studio",
  ]);
  await visitWorkspace(page, "/demo/admin?section=featured");
  await feature(page, "Fern & Field Inspections", false);
  await page
    .getByRole("link", { name: "View homepage featured examples", exact: true })
    .click();
  await expect(page).toHaveURL("/#featured-heading");
  await expect(page.getByRole("heading", { name: "Featured listing examples", exact: true })).toBeVisible();
  await expect(featured(page, "Fern & Field Inspections")).toHaveCount(0);
  await signIn(page, "admin");
  await feature(page, "Cedar Path Remediation", true);
  await page
    .getByRole("link", { name: "View homepage featured examples", exact: true })
    .click();
  await expect(page.locator(".featured-business-name")).toHaveText([
    "Cedar Path Remediation",
    "Softwood Design Studio",
  ]);
  await inspect(page, `homepage-${info.project.name}`);
  await featured(page, "Cedar Path Remediation")
    .getByRole("link", {
      name: "View profile for Cedar Path Remediation",
      exact: true,
    })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cedar Path Remediation",
  );
  await signIn(page, "admin");
  await section(page, "Admin", "Listings");
  await review(page, "Cedar Path Remediation");
  page.once("dialog", (dialog) => dialog.accept());
  await decision(page, "suspend", "Private suspension scenario");
  await memberBilling(page, "cedar");
  await page
    .getByRole("button", { name: "Try a renewal scenario", exact: true })
    .click();
  await outcome(page, true);
  await mainNav(page, "Home");
  await expect(featured(page, "Cedar Path Remediation")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(
    "Private featured scenario note",
  );
  await page.reload();
  await expect(page.locator(".featured-business-name")).toHaveText([
    "Fern & Field Inspections",
    "Softwood Design Studio",
  ]);
  expect(errors).toEqual([]);
});

test("submitted business checkout, failed renewal, recovery and cancellation update its public journey", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await prepare(page);
  await mainNav(page, "Home");
  await expect(featured(page, business)).toHaveCount(0);
  await memberBilling(page, "application");
  await expect(
    page.getByLabel("Example category", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Start simulated checkout", exact: true })
    .click();
  await expect(page.getByTestId("billing-stage")).toContainText(
    "$129 USD / month",
  );
  await expect(page.getByTestId("billing-stage")).toContainText(
    "Charged in this demo$0",
  );
  await outcome(page, true);
  await mainNav(page, "Home");
  await expect(featured(page, business)).toHaveCount(1);
  await featured(page, business)
    .getByRole("link", { name: `View profile for ${business}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(business);
  await memberBilling(page, "application");
  await page
    .getByRole("button", { name: "Try a renewal scenario", exact: true })
    .click();
  await outcome(page, false);
  await mainNav(page, "Home");
  await expect(featured(page, business)).toHaveCount(0);
  await memberBilling(page, "application");
  await page
    .getByRole("button", { name: "Review recovery", exact: true })
    .click();
  await outcome(page, true);
  await mainNav(page, "Home");
  await expect(featured(page, business)).toHaveCount(1);
  await memberBilling(page, "application");
  await page
    .getByRole("button", { name: "Review cancellation", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirm simulated cancellation",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("billing-status")).toHaveText("canceled");
  await inspect(page, `application-canceled-${info.project.name}`);
  await mainNav(page, "Home");
  await expect(featured(page, business)).toHaveCount(0);
  await mainNav(page, "Find Specialists");
  await expect(
    page.getByTestId("professional-card").filter({ hasText: business }),
  ).toHaveCount(0);
  await memberBilling(page, "application");
  await page
    .getByRole("button", { name: "Start simulated checkout", exact: true })
    .click();
  await outcome(page, true);
  await page
    .getByRole("link", {
      name: "Find this business in the directory",
      exact: true,
    })
    .click();
  await expect(
    page.getByTestId("professional-card").filter({ hasText: business }),
  ).toHaveCount(1);
  await mainNav(page, "Home");
  await expect(featured(page, business)).toHaveCount(1);
  for (const value of [
    "Fictional Owner",
    "session-owner@example.invalid",
    "Private approval scenario note",
    "Private featured scenario note",
  ])
    await expect(page.getByRole("main")).not.toContainText(value);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("billing screens support keyboard checkout exit, failed recovery, cancellation back and reset", async ({
  page,
}, info) => {
  await visitWorkspace(page, "/demo/member?section=membership", "inactive");
  await page
    .getByRole("button", { name: "Start simulated checkout", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Review simulated checkout",
      exact: true,
    }),
  ).toBeFocused();
  await inspect(page, `checkout-${info.project.name}`);
  await mainNav(page, "Pricing");
  await memberBilling(page, "inactive");
  await expect(
    page.getByRole("heading", {
      name: "Review simulated checkout",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Leave checkout", exact: true })
    .press("Enter");
  await expect(page.getByTestId("billing-status")).toHaveText("inactive");
  await page
    .getByRole("button", { name: "Start simulated checkout", exact: true })
    .press("Enter");
  await outcome(page, false);
  await inspect(page, `failed-${info.project.name}`);
  await page
    .getByRole("button", { name: "Review recovery", exact: true })
    .press("Enter");
  await inspect(page, `recovery-${info.project.name}`);
  await page
    .getByRole("button", { name: "Leave recovery", exact: true })
    .press("Enter");
  await expect(page.getByTestId("billing-status")).toHaveText("past_due");
  await page
    .getByRole("button", { name: "Review recovery", exact: true })
    .press("Enter");
  await outcome(page, false);
  await page
    .getByRole("button", { name: "Review recovery", exact: true })
    .press("Enter");
  await outcome(page, true);
  await inspect(page, `success-${info.project.name}`);
  await page
    .getByRole("button", { name: "Review cancellation", exact: true })
    .press("Enter");
  await inspect(page, `cancellation-${info.project.name}`);
  await page
    .getByRole("button", { name: "Keep current status", exact: true })
    .press("Enter");
  await expect(page.getByTestId("billing-status")).toHaveText("active");
  await resetSession(page);
  await signIn(page, "inactive");
  await section(page, "Member", "Membership");
  await expect(page.getByTestId("billing-status")).toHaveText("inactive");
  await expect(page.getByTestId("billing-stage")).toHaveCount(0);
});

test("320px text reflow, fresh context, sign-out and no-script homepage retain safe demo boundaries", async ({
  page,
  browser,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Explicit viewport and no-script checks run once",
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await visitWorkspace(page, "/demo/member?section=membership", "inactive");
  await page
    .getByRole("button", { name: "Start simulated checkout", exact: true })
    .click();
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await inspect(page, "checkout-320-text");
  await signIn(page, "approved");
  await section(page, "Member", "Membership");
  await expect(page.getByTestId("billing-stage")).toHaveCount(0);
  await memberBilling(page, "inactive");
  await expect(page.getByTestId("billing-stage")).toHaveCount(0);
  await expect(page.getByTestId("billing-status")).toHaveText("inactive");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 844 },
  });
  const noJs = await context.newPage();
  await noJs.goto(previewUrl("/"));
  await expect(noJs.locator(".featured-business-name")).toHaveText([
    "Fern & Field Inspections",
    "Softwood Design Studio",
  ]);
  await noJs
    .locator(".featured-card")
    .first()
    .getByRole("link", {
      name: "View profile for Fern & Field Inspections",
      exact: true,
    })
    .click();
  await expect(noJs.getByRole("heading", { level: 1 })).toHaveText(
    "Fern & Field Inspections",
  );
  await noJs.goto(previewUrl("/demo/member?section=membership"));
  await expect(
    noJs.getByRole("heading", { name: "Checking session", exact: true }),
  ).toBeVisible();
  await expect(
    noJs.getByText("Enable JavaScript to sign in and open your workspace.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(noJs.getByTestId("billing-demo")).toHaveCount(0);
  await context.close();
  await page.reload();
  await expect(page.getByTestId("billing-demo")).toHaveCount(0);
});
