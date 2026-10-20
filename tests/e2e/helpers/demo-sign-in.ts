import { expect, type Page } from "@playwright/test";
const labels: Record<string, string> = {
  admin: "Administrator",
  builder: "Hearthside Building Co.",
  approved: "Meadow Studio",
  pending: "Pending Studio",
  rejected: "Rejected Studio",
  inactive: "Inactive Studio",
  coordinator: "Willow Studio",
  application: "Your submitted application",
  fern: "Fern & Field Inspections",
  cedar: "Cedar Path Remediation",
};
export async function signIn(page: Page, account = "approved") {
  const target = account === "admin" ? "/admin/login" : "/login";
  const isLogin = () => ["/login", "/admin/login"].includes(new URL(page.url()).pathname);
  const accountLink = page.locator("[data-demo-account]");
  const current = (await accountLink.count())
    ? await accountLink.getAttribute("data-demo-account")
    : null;
  if (current === account) {
    if (isLogin())
      await page
        .getByRole("link", { name: "Open your dashboard", exact: true })
        .click();
    else if (new URL(page.url()).pathname !== `/demo/${account === "admin" ? "admin" : "member"}`) {
      const menu = page.getByRole("button", { name: "Open navigation", exact: true });
      if (await menu.isVisible()) await menu.click();
      await accountLink.click();
      await expect(page).toHaveURL(`/demo/${account === "admin" ? "admin" : "member"}`);
    }
    return;
  }
  const gate = page.getByRole("link", {
    name: "Go to sign-in",
    exact: true,
  });
  if (current === null && new URL(page.url()).pathname.startsWith("/demo/")) {
    await gate.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  }
  if (await gate.isVisible()) await gate.click();
  else if (!isLogin()) {
    const change = page.getByRole("button", {
      name: "Switch account",
      exact: true,
    });
    if (await change.isVisible()) {
      const accept = (dialog: import("@playwright/test").Dialog) =>
        dialog.accept();
      page.on("dialog", accept);
      await change.click();
      page.off("dialog", accept);
    } else
      await page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Sign in", exact: true })
        .click();
  }
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  if (new URL(page.url()).pathname !== target) {
    if (account === "admin") {
      await signIn(page, "approved");
      await page.getByRole("navigation", { name: "Workspaces" }).getByRole("link", { name: "Admin overview", exact: true }).click();
      await expect(page).toHaveURL("/demo/admin");
    } else {
      await page.getByRole("contentinfo").getByRole("link", { name: "Member area", exact: true }).click();
      await expect(page).toHaveURL("/demo/member");
    }
    await signIn(page, account);
    return;
  }
  if (
    await page
      .getByRole("heading", { name: "You’re already signed in" })
      .isVisible()
  ) {
    const accept = (dialog: import("@playwright/test").Dialog) =>
      dialog.accept();
    page.on("dialog", accept);
    await page
      .getByRole("button", { name: "Switch account", exact: true })
      .click();
    page.off("dialog", accept);
  }
  const shortcuts = page.locator(".login-shortcuts");
  if ((await shortcuts.getAttribute("open")) === null)
    await shortcuts.locator("summary").press("Enter");
  await page
    .getByRole("button", { name: `Use ${labels[account]}`, exact: true })
    .press("Enter");
  await expect(
    page.getByLabel("Account email", { exact: true }),
  ).toHaveValue(`${account}@example.invalid`);
  await expect(
    page.getByLabel("Access code", { exact: true }),
  ).toHaveValue("home-access");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .press("Enter");
  await expect(page.locator("[data-demo-account]")).toHaveAttribute(
    "data-demo-account",
    account,
  );
  await expect(page.getByTestId("demo-identity")).toHaveAttribute(
    "data-account",
    account,
  );
}
export async function switchMember(page: Page, memberId: string) {
  await signIn(
    page,
    memberId === "demo-local-application"
      ? "application"
      : memberId.replace("member-example-", ""),
  );
}
export async function visitWorkspace(
  page: Page,
  url: string,
  account = url.includes("/demo/admin") ? "admin" : "approved",
) {
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await signIn(page, account);
}
