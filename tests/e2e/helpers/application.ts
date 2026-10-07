import type { Page } from "@playwright/test";
import { signIn } from "./demo-sign-in";
export async function fillApplication(page: Page) {
  await page.getByLabel("Your name", { exact: true }).fill("Fictional Owner");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Session Sample Business");
  await page
    .getByLabel("Contact email", { exact: true })
    .fill("session-owner@example.invalid");
  await page.getByLabel("City", { exact: true }).fill("Raleigh");
  await page.getByLabel("State (2-letter abbreviation)").fill("NC");
  await page.getByRole("checkbox", { name: /Healthy Home Designers/ }).check();
  await page.getByRole("checkbox", { name: /Healthy Home Trades/ }).check();
  await page
    .getByLabel("Services", { exact: true })
    .fill("Sample material selection\nSample planning");
  await page
    .getByLabel("Business description", { exact: true })
    .fill("A fictional business for a local demonstration.");
  await page
    .getByLabel("Healthy-home practices", { exact: true })
    .fill("Sample moisture-aware materials and ventilation planning.");
  await page
    .getByLabel("Listed credentials (optional)")
    .fill("Fictional sample course");
}
export async function mainNav(page: Page, name: string) {
  if (name === "Home") {
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Restored Healthy Homes — home", exact: true })
      .press("Enter");
    return;
  }
  if (name === "Member preview") {
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Member area", exact: true })
      .click();
    const account = (await page.locator("[data-demo-account]").count())
      ? await page
          .locator("[data-demo-account]")
          .getAttribute("data-demo-account")
      : null;
    await signIn(page, account && account !== "admin" ? account : "approved");
    return;
  }
  const toggle = page.getByRole("button", { name: "Open navigation" });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: true })
    .press("Enter");
}
