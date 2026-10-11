import { previewUrl } from "./helpers/preview-url";
import { signIn, switchMember, visitWorkspace } from "./helpers/demo-sign-in";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fillApplication, mainNav } from "./helpers/application";
import { section, resetSession } from "./helpers/dashboard";

test("public application, keyboard validation, shared member edits and reset", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await mainNav(page, "List Your Business");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "List Your Business",
  );
  await expect(page.getByRole("checkbox")).toHaveCount(8);
  await expect(page.getByLabel("Your name", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Create application" }).press("Enter");
  await expect(page.getByLabel("Your name", { exact: true })).toBeFocused();
  await expect(
    page.getByRole("alert").filter({ hasText: "Check the highlighted" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/application-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  await fillApplication(page);
  const requests: string[] = [];
  page.on("request", (request) =>
    requests.push(
      `${request.method()} ${request.url()} ${request.postData() ?? ""}`,
    ),
  );
  await page.getByRole("button", { name: "Create application" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Application prepared" }),
  ).toBeFocused();
  await expect(
    page.getByText("Application status: pending.", { exact: true }),
  ).toBeVisible();
  expect(
    requests.some((request) =>
      /POST|session-owner|Session.Sample.Business/.test(request),
    ),
  ).toBe(false);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/application-confirmation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open member workspace" }).click();
  await signIn(page, "application");
  await expect(page.getByTestId("member-approval")).toHaveText("pending");
  await expect(page.getByTestId("selected-business")).toHaveText(
    "Session Sample Business",
  );
  await section(page, "Member", "Inquiries");
  await expect(
    page.getByText("No messages yet.", { exact: true }),
  ).toBeVisible();
  await section(page, "Member", "Profile");
  await expect(
    page.locator(
      'input[name="approval"],input[name="Subscription"],input[name="suspended"],input[name="id"],input[name="verifiedCredentials"]',
    ),
  ).toHaveCount(0);
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Locally Edited Sample");
  await page
    .getByLabel("Listed credentials (optional)")
    .fill("New fictional training");
  await page
    .getByRole("button", { name: "Update local preview" })
    .press("Enter");
  await page.getByText("Public profile", { exact: true }).click();
  await expect(page.getByTestId("member-preview-name")).toHaveText(
    "Locally Edited Sample",
  );
  await expect(
    page.getByText("New fictional training — submitted claim, unverified", {
      exact: true,
    }),
  ).toBeVisible();
  await section(page, "Member", "Overview");
  await expect(page.getByTestId("member-approval")).toHaveText("pending");
  await mainNav(page, "List Your Business");
  await expect(
    page.getByText(/Locally Edited Sample is ready to review/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open member workspace" }).click();
  await signIn(page, "application");
  await expect(page.getByTestId("selected-business")).toHaveText(
    "Locally Edited Sample",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/member-session-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  await resetSession(page);
  await expect(page.getByTestId("selected-business")).toHaveText(
    "Meadow Studio",
  );
  await mainNav(page, "List Your Business");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "",
  );
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(
    requests.some((request) =>
      /POST|session-owner|Locally.Edited.Sample/.test(request),
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("example states, seeded inbox, client navigation and refresh lifetime", async ({
  page,
  context,
}) => {
  // Multiple account switches and independent-tab/reload journeys need more
  // than the default 45 seconds on the shared local browser-test host.
  test.setTimeout(90000);
  await visitWorkspace(page, "/demo/member");
  await switchMember(page, "member-example-rejected");
  await expect(page.getByTestId("member-approval")).toHaveText("rejected");
  await switchMember(page, "member-example-pending");
  await expect(page.getByTestId("member-approval")).toHaveText("pending");
  await switchMember(page, "member-example-approved");
  await expect(page.getByTestId("member-approval")).toHaveText("approved");
  await section(page, "Member", "Inquiries");
  await page.getByText("Material consultation", { exact: true }).click();
  await expect(
    page.getByText(/explore material choices for a renovation/),
  ).toBeVisible();
  await section(page, "Member", "Profile");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Temporary Local Edit");
  await page.getByRole("button", { name: "Update local preview" }).click();
  await mainNav(page, "Find professionals");
  await expect(
    page.getByText("Temporary Local Edit", { exact: true }),
  ).toHaveCount(0);
  await mainNav(page, "Member dashboard");
  await expect(page.getByTestId("selected-business")).toHaveText(
    "Temporary Local Edit",
  );
  const other = await context.newPage();
  await other.goto("/demo/member");
  await expect(
    other.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await signIn(other);
  await expect(other.getByTestId("selected-business")).toHaveText(
    "Meadow Studio",
  );
  await other.close();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await signIn(page);
  await expect(page.getByTestId("selected-business")).toHaveText(
    "Meadow Studio",
  );
  await mainNav(page, "List Your Business");
  await fillApplication(page);
  await page.getByRole("button", { name: "Create application" }).click();
  await expect(
    page.getByRole("heading", { name: "Application prepared" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "",
  );
});

test("application and editing cannot natively submit without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(previewUrl("/list-your-business"));
    await expect(
      page.getByText(/JavaScript is required for this form/),
    ).toBeVisible();
    await expect(page.getByLabel("Your name", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Create application" }),
    ).toBeDisabled();
    await page.goto(previewUrl("/demo/member?section=profile"));
    await expect(
      page.getByRole("heading", { name: "Checking session" }),
    ).toBeVisible();
    await expect(page.getByLabel("Business name", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Update local preview" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Reset workspace" }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
