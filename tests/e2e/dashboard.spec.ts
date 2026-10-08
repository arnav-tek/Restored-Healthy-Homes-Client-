import { signIn, switchMember, visitWorkspace } from "./helpers/demo-sign-in";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  section,
  review,
  workspace,
  resetSession,
  decision,
} from "./helpers/dashboard";
test.setTimeout(120000);

test("dashboard sections, direct URLs, history and filters retain selected records", async ({
  page,
}) => {
  await visitWorkspace(page, "/demo/admin?section=applications&status=pending");
  await expect(
    page.getByLabel("Application status", { exact: true }),
  ).toHaveValue("pending");
  await expect(
    page.getByText("1 of 7 applications shown", { exact: true }),
  ).toBeVisible();
  await review(page, "Pending Studio");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page).toHaveURL(/record=member-example-pending.*status=pending/);
  await page.getByRole("link", { name: "Back to applications" }).press("Enter");
  await expect(
    page.getByLabel("Application status", { exact: true }),
  ).toHaveValue("pending");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Review Pending Studio",
  );
  await page.goForward();
  await expect(
    page.getByLabel("Application status", { exact: true }),
  ).toHaveValue("pending");
  await page.reload();
  await signIn(page, "admin");
  await expect(
    page.getByText("1 of 7 applications shown", { exact: true }),
  ).toBeVisible();
  await section(page, "Admin", "Overview");
  await page
    .getByRole("link", { name: /Pending applications.*1.*Review applications/ })
    .click();
  await review(page, "Pending Studio");
  await decision(page, "approved", "Fictional review complete");
  await section(page, "Admin", "Overview");
  await expect(
    page.getByRole("link", { name: /Pending applications.*0/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Eligible listings.*4/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No pending applications", exact: true }),
  ).toBeVisible();
  await visitWorkspace(
    page,
    "/demo/admin?section=applications&record=demo-local-application",
  );
  await expect(
    page.getByRole("heading", {
      name: "Record unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to applications" }).click();
  await expect(
    page.getByText("7 of 7 applications shown", { exact: true }),
  ).toBeVisible();
  await visitWorkspace(
    page,
    "/demo/member?section=membership&record=member-example-inactive",
    "inactive",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your membership",
  );
  await expect(page.getByText("inactive", { exact: true })).toBeVisible();
  await visitWorkspace(
    page,
    "/demo/member?section=applications&section=profile",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your business at a glance",
  );
});

test("unsaved profile decision and category drafts survive navigation and reset asks first", async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  await visitWorkspace(page, "/demo/member?section=profile");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Unsaved fictional business");
  await section(page, "Member", "Inquiries");
  await section(page, "Member", "Profile");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Unsaved fictional business",
  );
  await switchMember(page, "member-example-pending");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Pending Studio",
  );
  await switchMember(page, "member-example-approved");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Meadow Studio",
  );
  await section(page, "Member", "Inquiries");
  await page.goBack();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Meadow Studio",
  );
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Your inquiries" }),
  ).toBeVisible();
  await section(page, "Member", "Profile");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Meadow Studio",
  );
  await workspace(page, "Admin overview");
  await section(page, "Admin", "Applications");
  await page.getByLabel("Search applications", { exact: true }).fill("Pending");
  await section(page, "Admin", "Overview");
  await section(page, "Admin", "Applications");
  await expect(
    page.getByLabel("Search applications", { exact: true }),
  ).toHaveValue("Pending");
  await expect(
    page.getByText("7 of 7 applications shown", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await review(page, "Meadow Studio");
  await page
    .getByLabel("Applicant-facing reason")
    .fill("Unsaved fictional review reason");
  await page.getByRole("link", { name: "Back to applications" }).click();
  await review(page, "Pending Studio");
  await expect(page.getByLabel("Applicant-facing reason")).toHaveValue("");
  await page.getByRole("link", { name: "Back to applications" }).click();
  await review(page, "Meadow Studio");
  await expect(page.getByLabel("Applicant-facing reason")).toHaveValue(
    "Unsaved fictional review reason",
  );
  await section(page, "Admin", "Categories");
  await page.getByLabel("Category to rename").selectOption("healthy-designers");
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Unsaved category label");
  await page.getByLabel("Category to rename").selectOption("mold-inspection");
  await page.getByLabel("Category to rename").selectOption("healthy-designers");
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Unsaved category label",
  );
  await section(page, "Admin", "Overview");
  await section(page, "Admin", "Categories");
  await expect(page.getByLabel("Category to rename")).toHaveValue(
    "healthy-designers",
  );
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Unsaved category label",
  );
  await resetSession(page, false);
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Unsaved category label",
  );
  await resetSession(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your directory at a glance",
  );
  await section(page, "Admin", "Categories");
  await page.getByLabel("Category to rename").selectOption("healthy-designers");
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Healthy Home Designers",
  );
  await workspace(page, "Member overview");
  await section(page, "Member", "Profile");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Meadow Studio",
  );
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Refresh clears this draft");
  await page.reload();
  await signIn(page);
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Meadow Studio",
  );
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
});

test("focused dashboard screens stay accessible with long names errors empty states and confirmations", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const longBusiness =
    "Fictional Healthy Home Design and Material Planning Studio for Thoughtful Comfortable Living Spaces";
  const longCategory =
    "Thoughtful Healthy Home Design and Sustainable Interior Material Planning";
  async function capture(name: string) {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `output/playwright/phase-2d-${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  await visitWorkspace(page, "/demo/member?section=profile");
  await page.getByLabel("Business name", { exact: true }).fill(longBusiness);
  await page.getByRole("button", { name: "Update local preview" }).click();
  await page.getByText("Public profile", { exact: true }).click();
  await capture("member-profile");
  await section(page, "Member", "Overview");
  await capture("member-overview");
  await section(page, "Member", "Inquiries");
  await capture("member-inquiries");
  await switchMember(page, "member-example-pending");
  await capture("member-empty");
  await switchMember(page, "member-example-approved");
  await section(page, "Member", "Membership");
  await capture("member-membership");
  await workspace(page, "Admin overview");
  await capture("admin-overview");
  await section(page, "Admin", "Applications");
  await capture("admin-applications");
  await review(page, longBusiness);
  await page.getByRole("button", { name: "Apply decision" }).click();
  await capture("admin-validation");
  await decision(page, "approved", "Sample review confirmation");
  await capture("admin-confirmation");
  await page.getByRole("link", { name: "Listing status", exact: true }).click();
  await capture("admin-listings");
  await page
    .getByRole("link", { name: "Review credentials", exact: true })
    .click();
  await capture("admin-credentials");
  await section(page, "Admin", "Categories");
  await page.getByLabel("Category to rename").selectOption("healthy-designers");
  await page.getByLabel("Display name", { exact: true }).fill(longCategory);
  await page.getByRole("button", { name: "Rename category" }).click();
  await capture("admin-categories");
  await section(page, "Admin", "Listings");
  await page
    .getByTestId("session-directory")
    .locator("summary")
    .filter({ hasText: longBusiness })
    .click();
  await capture("admin-long-list");
  expect(errors).toEqual([]);
});
