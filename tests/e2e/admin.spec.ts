import { previewUrl } from "./helpers/preview-url";
import { signIn, visitWorkspace } from "./helpers/demo-sign-in";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fillApplication, mainNav } from "./helpers/application";
import {
  workspace,
  section,
  review,
  decision,
  resetSession,
} from "./helpers/dashboard";
test.setTimeout(90000);

test("application admin decision member confirmation and protected edits stay coherent", async ({
  page,
}) => {
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/list-your-business");
  await fillApplication(page);
  await page.getByRole("button", { name: "Create application" }).click();
  await page.getByRole("link", { name: "Open member workspace" }).click();
  await signIn(page, "application");
  await workspace(page, "Admin overview");
  await section(page, "Admin", "Applications");
  await expect(page.getByText(/8 of 8 applications shown/)).toBeVisible();
  await review(page, "Session Sample Business");
  await page.getByRole("button", { name: "Apply decision" }).press("Enter");
  await expect(page.getByLabel("Applicant-facing reason")).toBeFocused();
  await decision(page, "approved", "Fictional application accepted");
  await expect(page.getByTestId("admin-approval")).toHaveText("approved");
  await page.getByRole("link", { name: "Listing status", exact: true }).click();
  await expect(page.getByTestId("session-directory")).not.toContainText(
    "Session Sample Business",
  );
  await workspace(page, "Member overview", "application");
  await expect(page.getByTestId("member-approval")).toHaveText("approved");
  await expect(page.getByText("inactive ", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Decision reason: Fictional application accepted"),
  ).toBeVisible();
  await section(page, "Member", "Profile");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Edited Admin Sample");
  await page.getByRole("button", { name: "Update local preview" }).click();
  await section(page, "Member", "Overview");
  await expect(page.getByTestId("member-approval")).toHaveText("approved");
  await workspace(page, "Admin overview");
  await section(page, "Admin", "Applications");
  await review(page, "Edited Admin Sample");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Reject Edited Admin Sample");
    await dialog.dismiss();
  });
  await decision(page, "rejected", "Fictional service details need revision");
  await expect(page.getByTestId("admin-approval")).toHaveText("approved");
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Apply decision" }).click();
  await expect(page.getByTestId("admin-approval")).toHaveText("rejected");
  await workspace(page, "Member overview", "application");
  await expect(page.getByTestId("member-approval")).toHaveText("rejected");
  await mainNav(page, "List Your Business");
  await expect(
    page.getByText("Application status: rejected.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Decision reason: Fictional service details need revision"),
  ).toBeVisible();
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("admin suspension credentials category labels public projection and reset", async ({
  page,
}, testInfo) => {
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await visitWorkspace(page, "/demo/admin?section=listings");
  const directory = page.getByTestId("session-directory");
  await expect(directory.getByRole("article")).toHaveCount(4);
  for (const text of [
    "member@example.invalid",
    "Member",
    "Fictional application meets",
  ])
    await expect(directory).not.toContainText(text);
  await page.getByLabel("Search applications").fill("unmatched search");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText(/No applications match/)).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByLabel("Application status", { exact: true })
    .selectOption("pending");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText(/1 of 7 applications shown/)).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await review(page, "Meadow Studio");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Suspend Meadow Studio");
    await dialog.accept();
  });
  await decision(page, "suspend", "Fictional suspension check");
  await expect(directory.getByRole("article")).toHaveCount(3);
  await page.getByRole("link", { name: "Back to listings" }).click();
  await page.getByLabel("Suspension filter").selectOption("suspended");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText(/1 of 7 applications shown/)).toBeVisible();
  await review(page, "Meadow Studio");
  await decision(page, "reinstate", "Fictional reinstatement check");
  await expect(directory.getByRole("article")).toHaveCount(4);
  await page.getByRole("link", { name: "Back to listings" }).click();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await review(page, "Inactive Studio");
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await decision(page, "suspend", "Fictional inactive suspension");
  await decision(page, "reinstate", "Fictional inactive reinstatement");
  await expect(directory).not.toContainText("Inactive Studio");
  await page.getByRole("link", { name: "Back to listings" }).click();
  await review(page, "Meadow Studio");
  await page
    .getByRole("link", { name: "Review credentials", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mark as reviewed", exact: true })
    .click();
  await expect(page.getByText("Reviewed", { exact: true })).toBeVisible();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Meadow Studio");
    expect(dialog.message()).toContain("Course attendance");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Remove review status" }).click();
  await expect(page.getByText("Reviewed", { exact: true })).toBeVisible();
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Remove review status" }).click();
  await expect(page.getByText("Unverified", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Mark as reviewed", exact: true })
    .click();
  await page.getByRole("link", { name: "Listing status", exact: true }).click();
  await expect(directory).toContainText("reviewed");
  await section(page, "Admin", "Categories");
  await page.getByLabel("Category to rename").selectOption("healthy-designers");
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Mold Remediation");
  await page.getByRole("button", { name: "Rename category" }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toBeFocused();
  await expect(page.getByText(/Use a distinct name/)).toBeVisible();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Thoughtful Sample Designers");
  await page.getByRole("button", { name: "Rename category" }).press("Enter");
  await section(page, "Admin", "Listings");
  await expect(directory).toContainText("Thoughtful Sample Designers");
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
    path: `output/playwright/admin-session-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await workspace(page, "Member overview");
  await section(page, "Member", "Profile");
  await page.getByText("Public profile", { exact: true }).click();
  await expect(page.getByText(/Course attendance.*reviewed/)).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Thoughtful Sample Designers/ }),
  ).toBeChecked();
  await page
    .getByLabel("Listed credentials (optional)")
    .fill("Changed fictional credential");
  await page.getByRole("button", { name: "Update local preview" }).click();
  await expect(
    page.getByText(
      "Changed fictional credential — submitted claim, unverified",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await mainNav(page, "List Your Business");
  await expect(
    page.getByRole("checkbox", { name: /Thoughtful Sample Designers.*129/ }),
  ).toBeVisible();
  await mainNav(page, "Member dashboard");
  await workspace(page, "Admin overview");
  await section(page, "Admin", "Listings");
  await expect(directory).toContainText(
    "Changed fictional credential — submitted claim, unverified",
  );
  await resetSession(page);
  await section(page, "Admin", "Listings");
  await expect(directory).toContainText("Healthy Home Designers");
  await expect(directory).toContainText(
    "Course attendance — submitted claim, unverified",
  );
  await expect(directory).not.toContainText("Thoughtful Sample Designers");
  await expect(directory.getByRole("article")).toHaveCount(4);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("admin controls cannot submit without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(
      previewUrl(
        "/demo/admin?section=applications&record=member-example-approved",
      ),
    );
    await expect(
      page.getByRole("heading", { name: "Checking session" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Apply decision" }),
    ).toHaveCount(0);
    await page.goto(
      previewUrl(
        "/demo/admin?section=credentials&record=member-example-approved",
      ),
    );
    await expect(
      page.getByRole("button", { name: "Mark as reviewed", exact: true }),
    ).toHaveCount(0);
    await page.goto(previewUrl("/demo/admin?section=applications"));
    await expect(page.getByLabel("Search applications")).toHaveCount(0);
    await page.goto(previewUrl("/demo/admin?section=categories"));
    await expect(page.getByLabel("Display name", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Rename category" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Reset workspace" }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
