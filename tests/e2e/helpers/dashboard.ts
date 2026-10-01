import { expect, type Page } from "@playwright/test";
export async function section(
  page: Page,
  area: "Member" | "Admin",
  name: string,
) {
  const menu = page.locator(".workspace-mobile-nav");
  if ((await menu.isVisible()) && (await menu.getAttribute("open")) === null)
    await menu.locator("summary").click();
  await page
    .getByRole("navigation", { name: `${area} sections` })
    .getByRole("link", { name, exact: true })
    .press("Enter");
}
export async function workspace(
  page: Page,
  name: "Admin overview" | "Member overview",
) {
  await page
    .getByRole("navigation", { name: "Demo workspaces" })
    .getByRole("link", { name })
    .click();
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
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("unsaved drafts will be discarded");
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Reset demo session" }).click();
}
export async function decision(page: Page, action: string, reason: string) {
  await page.getByLabel("Demo action", { exact: true }).selectOption(action);
  await page.getByLabel("Applicant-facing demo reason").fill(reason);
  await page
    .getByRole("button", { name: "Apply demo decision" })
    .press("Enter");
}
