import { expect, type Page } from "@playwright/test";
import { signIn } from "./demo-sign-in";
export async function section(
  page: Page,
  area: "Member" | "Admin",
  name: string,
) {
  const menu = page.locator(".workspace-mobile-nav");
  if ((await menu.isVisible()) && (await menu.getAttribute("open")) === null)
    await menu.locator("summary").click();
  const link = page
    .getByRole("navigation", { name: `${area} sections` })
    .getByRole("link", { name, exact: true }).filter({ visible: true });
  const destination = await link.getAttribute("href");
  await link.press("Enter");
  await expect(page).toHaveURL(destination!);
}
export async function workspace(
  page: Page,
  name: "Admin overview" | "Member overview",
  account = name === "Admin overview" ? "admin" : "approved",
) {
  await page
    .getByRole("navigation", { name: "Workspaces" })
    .getByRole("link", { name })
    .click();
  await expect(page).toHaveURL(
    name === "Admin overview" ? "/demo/admin" : "/demo/member",
  );
  await signIn(page, account);
}
export async function review(page: Page, business: string) {
  await page
    .getByRole("link", { name: `Review ${business}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Review ${business}`,
  );
}
export async function resetSession(page: Page, accept = true) {
  const account = (await page.locator("[data-demo-account]").count())
    ? await page
        .locator("[data-demo-account]")
        .getAttribute("data-demo-account")
    : null;
  const area = new URL(page.url()).pathname.match(
    /^\/demo\/(admin|member)$/,
  )?.[1];
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("unsaved drafts will be discarded");
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Reset workspace" }).click();
  if (accept && area && account) {
    await expect(page).toHaveURL(`/demo/${area}`);
    await expect(
      page.getByRole("heading", { name: "Sign-in required" }),
    ).toBeVisible();
    await signIn(page, account === "application" ? "approved" : account);
  }
}
export async function decision(page: Page, action: string, reason: string) {
  await page.getByLabel("Action", { exact: true }).selectOption(action);
  await page.getByLabel("Applicant-facing reason").fill(reason);
  await page
    .getByRole("button", { name: "Apply decision" })
    .press("Enter");
}
