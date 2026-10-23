import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visitWorkspace, signIn } from "./helpers/demo-sign-in";
import {
  section,
  review,
  decision,
  resetSession,
  workspace,
} from "./helpers/dashboard";

test.setTimeout(90000);

test("admin demonstrates membership, suspended featured eligibility, profile editing and member continuity", async ({
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
  await review(page, "Inactive Studio");
  await page
    .getByRole("link", { name: "Manage membership scenario", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply membership scenario" }).click();
  await expect(page.getByLabel("Scenario note", { exact: true })).toBeFocused();
  await page.getByLabel("Simulated membership status").selectOption("active");
  await page
    .getByLabel("Scenario note", { exact: true })
    .fill("Show successful payment");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Apply membership scenario" }).click();
  await expect(
    page.getByText("This record is hidden from the directory overview.", {
      exact: false,
    }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Apply membership scenario" }).click();
  await expect(
    page.getByText("This record is eligible in the directory overview.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open listing and profile" }).click();
  await page.getByText("Edit business profile", { exact: true }).click();
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Showcase Studio");
  await page.getByRole("button", { name: "Save profile changes" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Review Showcase Studio",
  );
  await expect(page.getByTestId("session-directory")).toContainText(
    "Showcase Studio",
  );
  await page.getByRole("link", { name: "Manage featured placement" }).click();
  await page.getByLabel("Featured entitlement").selectOption("active");
  await page
    .getByLabel("Scenario note", { exact: true })
    .fill("Show featured upgrade");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Apply featured scenario" }).click();
  await expect(
    page.getByTestId("featured-placement-preview").getByRole("listitem"),
  ).toHaveText(["Showcase Studio", "Fern & Field Inspections"]);
  await page.getByRole("link", { name: "Open listing and profile" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await decision(page, "suspend", "Show suspension overrides payment");
  await page.getByRole("link", { name: "Manage featured placement" }).click();
  await expect(
    page.getByTestId("featured-placement-preview").getByRole("listitem"),
  ).toHaveText(["Fern & Field Inspections"]);
  await expect(page.getByText(/entitlement is retained/)).toBeVisible();
  await section(page, "Admin", "Analytics");
  await expect(page.getByRole("table")).toBeVisible();
  if (page.viewportSize()!.width < 600) {
    const counts = page.getByRole("region", {
      name: "Category membership counts",
    });
    await counts.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => counts.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await counts.evaluate((element) => {
      element.scrollLeft = 0;
    });
  }
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
    path: `output/playwright/admin-analytics-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await workspace(page, "Member overview", "inactive");
  await expect(
    page.getByRole("heading", { name: "Showcase Studio", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Suspended", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("admin resource draft survives navigation, publishes to preview, unpublishes on editing and clears on reset", async ({
  page,
}, testInfo) => {
  await visitWorkspace(page, "/demo/admin?section=content");
  await page
    .getByRole("link", { name: "Create resource", exact: true })
    .click();
  await page.getByRole("button", { name: "Save resource draft" }).click();
  await expect(page.getByLabel("Resource title")).toBeFocused();
  await page.getByLabel("Resource title").fill("Owner showcase article");
  await page
    .getByLabel("Resource summary")
    .fill("A sample summary that demonstrates the resource workflow.");
  await page
    .getByLabel("Article body")
    .fill(
      "First paragraph of this fictional owner resource, written for the workflow preview.\n\nA second paragraph demonstrates plain text rendering.",
    );
  await section(page, "Admin", "Analytics");
  await section(page, "Admin", "Content");
  await page
    .getByRole("link", { name: "Create resource", exact: true })
    .click();
  await expect(page.getByLabel("Resource title")).toHaveValue(
    "Owner showcase article",
  );
  await page.getByRole("button", { name: "Save resource draft" }).click();
  const card = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Owner showcase article",
      exact: true,
    }),
  });
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Publish to showcase" }).click();
  await expect(page.getByTestId("published-resource-preview")).toContainText(
    "Owner showcase article",
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
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/admin-content-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Edit Owner showcase article", exact: true })
    .click();
  await page.getByLabel("Resource title").fill("Edited owner article");
  await page.getByRole("button", { name: "Save resource draft" }).click();
  await expect(
    page.getByTestId("published-resource-preview"),
  ).not.toContainText("Edited owner article");
  await section(page, "Admin", "Overview");
  await expect(
    page.getByRole("heading", { name: "Session activity" }),
  ).toBeVisible();
  await resetSession(page);
  await section(page, "Admin", "Content");
  await expect(
    page.getByRole("link", { name: "Edit Edited owner article" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await signIn(page, "admin");
  await section(page, "Admin", "Content");
  await expect(page.getByTestId("published-resource-preview")).toContainText(
    "No resources published",
  );
});

test("admin showcase overview and listing editor reflow accessibly with per-record drafts", async ({
  page,
}, testInfo) => {
  await visitWorkspace(page, "/demo/admin");
  await expect(
    page.getByRole("heading", {
      name: "From application to an eligible listing",
    }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/admin-overview-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await section(page, "Admin", "Listings");
  await review(page, "Meadow Studio");
  await page.getByText("Edit business profile", { exact: true }).click();
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Unsubmitted admin draft");
  await section(page, "Admin", "Listings");
  await review(page, "Inactive Studio");
  await page.getByText("Edit business profile", { exact: true }).click();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Inactive Studio",
  );
  await section(page, "Admin", "Listings");
  await review(page, "Meadow Studio");
  await page.getByText("Edit business profile", { exact: true }).click();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Unsubmitted admin draft",
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
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/admin-editor-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
