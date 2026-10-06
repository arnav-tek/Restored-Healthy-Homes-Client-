import { expect, type Page } from "@playwright/test";
const labels: Record<string, string> = {
  admin: "Demo administrator",
  approved: "Meadow Sample Studio",
  pending: "Pending Sample Studio",
  rejected: "Rejected Sample Studio",
  inactive: "Inactive Sample Studio",
  coordinator: "Willow Sample Studio",
  application: "Your submitted demo application",
  fern: "Fern & Field Inspections",
  cedar: "Cedar Path Remediation",
};
export async function signIn(page: Page, account = "approved") {
  const accountLink = page.locator("[data-demo-account]");
  const current = (await accountLink.count())
    ? await accountLink.getAttribute("data-demo-account")
    : null;
  if (current === account) {
    if (new URL(page.url()).pathname === "/login")
      await page
        .getByRole("link", { name: "Open your dashboard", exact: true })
        .click();
    return;
  }
  const gate = page.getByRole("link", {
    name: "Go to demo sign-in",
    exact: true,
  });
  if (await gate.isVisible()) await gate.click();
  else if (!new URL(page.url()).pathname.startsWith("/login")) {
    const change = page.getByRole("button", {
      name: "Switch demo account",
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
        .getByRole("link", { name: "Demo sign-in", exact: true })
        .click();
  }
  await expect(
    page.getByRole("heading", { name: "Demo sign-in", exact: true }),
  ).toBeVisible();
  if (
    await page
      .getByRole("heading", { name: "A demo account is already selected" })
      .isVisible()
  ) {
    const accept = (dialog: import("@playwright/test").Dialog) =>
      dialog.accept();
    page.on("dialog", accept);
    await page
      .getByRole("button", { name: "Switch demo account", exact: true })
      .click();
    page.off("dialog", accept);
  }
  await page
    .getByRole("button", { name: `Use ${labels[account]}`, exact: true })
    .press("Enter");
  await expect(
    page.getByLabel("Demo account email", { exact: true }),
  ).toHaveValue(`${account}@example.invalid`);
  await expect(
    page.getByLabel("Public demo passcode", { exact: true }),
  ).toHaveValue("home-demo");
  await page
    .getByRole("button", { name: "Sign in to demo", exact: true })
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
    page.getByRole("heading", { name: "Demo sign-in required" }),
  ).toBeVisible();
  await signIn(page, account);
}
