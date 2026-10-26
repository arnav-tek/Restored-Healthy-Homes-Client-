import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, switchMember, visitWorkspace } from "./helpers/demo-sign-in";
import { section } from "./helpers/dashboard";
test.setTimeout(90000);
test("separate login pages reject the other account type", async ({ page }, info) => {
  await page.goto("/login?account=admin&returnTo=%2Fdemo%2Fadmin");
  await expect(page.getByLabel("Account email", { exact: true })).toHaveValue("");
  await expect(page.getByRole("group", { name: "Account type" })).toHaveCount(0);
  await expect(page.locator('a[href*="/admin"]')).toHaveCount(0);
  await page.locator(".login-shortcuts summary").click();
  await expect(page.getByRole("button", { name: "Use Administrator", exact: true })).toHaveCount(0);
  await page.getByLabel("Account email", { exact: true }).fill("admin@example.invalid");
  await page.getByLabel("Access code", { exact: true }).fill("home-access");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Account email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
  await page.goto("/admin/login?returnTo=%2Fdemo%2Fadmin%3Fsection%3Dapplications");
  const email = page.getByLabel("Account email", { exact: true });
  const code = page.getByLabel("Access code", { exact: true });
  await expect(code).toHaveAttribute("type", "password");
  await email.fill("approved@example.invalid");
  await code.fill("home-access");
  await page.getByRole("button", { name: "Show code", exact: true }).click();
  await expect(code).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide code", exact: true }).click();
  await expect(code).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
  await inspect(page, `admin-access-${info.project.name}`);
  await signIn(page, "admin");
  await expect(page).toHaveURL("/demo/admin?section=applications");
});
async function inspect(page: Page, name: string) {
  await expect(page.locator("main")).not.toContainText(
    /\b(temp|temporary|synthetic)\b/i,
  );
  if (new URL(page.url()).pathname.endsWith("/login")) {
    const note = page.locator("#demo-sign-in-note");
    await expect(note).toBeVisible();
    await expect(note).toContainText("Demo sign-in.");
    await expect(note).toContainText("Do not enter real credentials.");
    await expect(note).toContainText("Quick access");
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
    path: `output/playwright/phase-2f3-${name}.png`,
    fullPage: true,
  });
}
async function headerSignOut(page: Page) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Sign out", exact: true })
    .press("Enter");
}
test("demo sign-in presets, validation and keyboard journey keep credentials local", async ({
  page,
  context,
}, info) => {
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" || r.postData()) mutations.push(r.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Access code", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Use / })).toHaveCount(0);
  await inspect(page, `login-${info.project.name}`);
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .press("Enter");
  await expect(
    page.getByLabel("Account email", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Account email", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await inspect(page, `validation-${info.project.name}`);
  await page.locator(".login-shortcuts summary").press("Enter");
  await expect(page.getByRole("button", { name: /^Use / })).toHaveCount(8);
  await page
    .getByRole("button", { name: "Use Meadow Studio", exact: true })
    .press("Enter");
  await expect(
    page.getByLabel("Account email", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Access code", { exact: true })
    .fill("not-the-public-code");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .press("Enter");
  await expect(
    page.getByLabel("Access code", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Access code", { exact: true })
    .fill("home-access");
  await page.getByLabel("Access code", { exact: true }).press("Enter");
  await expect(page).toHaveURL("/demo/member");
  await expect(page.getByTestId("demo-identity")).toHaveAttribute(
    "data-account",
    "approved",
  );
  await expect(page.getByTestId("member-approval")).toHaveText("approved");
  await inspect(page, `member-${info.project.name}`);
  await page
    .getByRole("link", { name: "Public directory ↗", exact: true })
    .click();
  await page
    .getByRole("link", { name: /^View profile for / })
    .first()
    .click();
  await page
    .getByLabel("Name", { exact: true })
    .fill("Unsaved fictional inquiry");
  page.once("dialog", (dialog) => dialog.dismiss());
  await headerSignOut(page);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Unsaved fictional inquiry",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await headerSignOut(page);
  await expect(page).toHaveURL("/login");
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(await context.cookies()).toEqual([]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
test("direct workspace gates, safe returns, wrong workspace and status presets", async ({
  page,
}, info) => {
  await page.goto("/demo/admin?section=applications&status=pending");
  await expect(
    page.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply decision" }),
  ).toHaveCount(0);
  await inspect(page, `gate-${info.project.name}`);
  await signIn(page, "admin");
  await expect(page).toHaveURL(
    "/demo/admin?section=applications&status=pending",
  );
  await expect(
    page.getByLabel("Application status", { exact: true }),
  ).toHaveValue("pending");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Member area", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "This is a different workspace" }),
  ).toBeVisible();
  await expect(page.getByTestId("selected-business")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Open your dashboard", exact: true })
    .click();
  await expect(page).toHaveURL("/demo/admin");
  await inspect(page, `admin-${info.project.name}`);
  for (const [account, status] of [
    ["pending", "pending"],
    ["rejected", "rejected"],
    ["inactive", "approved"],
  ]) {
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Member area", exact: true })
      .click();
    await signIn(page, account);
    await expect(page.getByTestId("member-approval")).toHaveText(status);
    await expect(page.getByText("Not eligible", { exact: true })).toBeVisible();
  }
  for (const destination of [
    "https://evil.invalid",
    "//evil.invalid",
    "/demo/admin?section=applications",
    "/demo/member?section=qa&section=profile",
    "/demo/member?section=profile&q=%ZZ",
  ]) {
    await page.goto(`/login?returnTo=${encodeURIComponent(destination)}`);
    await signIn(page);
    await expect(page).toHaveURL("/demo/member");
  }
});
test("explicit switching and sign-out isolate drafts; saved records survive, reset and refresh clear identity", async ({
  page,
}) => {
  await visitWorkspace(page, "/demo/member?section=profile");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Saved fictional profile");
  await page.getByRole("button", { name: "Update local preview" }).click();
  await page
    .getByLabel("Business name", { exact: true })
    .fill("UNSAVED_ACCOUNT_ONE");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Switch account", exact: true })
    .click();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "UNSAVED_ACCOUNT_ONE",
  );
  await switchMember(page, "member-example-pending");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Pending Studio",
  );
  await switchMember(page, "member-example-approved");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Saved fictional profile",
  );
  await page
    .getByLabel("Business name", { exact: true })
    .fill("UNSAVED_LOGOUT");
  page.once("dialog", (dialog) => dialog.dismiss());
  await headerSignOut(page);
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "UNSAVED_LOGOUT",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await headerSignOut(page);
  await expect(page).toHaveURL("/login");
  await signIn(page);
  await section(page, "Member", "Profile");
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Saved fictional profile",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await signIn(page);
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Meadow Studio",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
});
test("no-script and prehydration views stay neutral; sign-in has no submission endpoint or private workspace HTML", async ({
  browser,
  request,
}) => {
  for (const area of ["member", "admin"]) {
    const response = await request.get(`/demo/${area}?section=profile`);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const html = await response.text();
    expect(html).toContain("Checking session");
    expect(html).not.toContain('data-testid="selected-business"');
    expect(html).not.toContain('id="workspace-title"');
  }
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled });
    const page = await context.newPage();
    if (javaScriptEnabled)
      await page.route("**/*.js*", (route) => route.abort());
    await page.goto("/login");
    await expect(
      page.getByLabel("Account email", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeDisabled();
    await page.locator(".login-shortcuts summary").click();
    await expect(
      page.getByRole("button", { name: "Use Meadow Studio", exact: true }),
    ).toBeDisabled();
    await page.goto("/demo/admin?section=applications");
    await expect(
      page.getByRole("heading", { name: "Checking session" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Admin sections" }),
    ).toHaveCount(0);
    await context.close();
  }
});
