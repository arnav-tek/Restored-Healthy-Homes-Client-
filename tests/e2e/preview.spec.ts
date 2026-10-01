import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { categories } from "../../src/domain/categories";
import { mkdir } from "node:fs/promises";

test("directory category interactions, disclosure and back navigation", async ({
  page,
}) => {
  await page.goto("/directory");
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  for (const category of categories) {
    await page
      .getByLabel("Professional category", { exact: true })
      .selectOption(category.id);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(new RegExp(`category=${category.id}`));
    await expect(page.getByTestId("professional-card")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: category.name, exact: true }),
    ).toBeVisible();
  }
  await page.getByText("Explore services", { exact: false }).click();
  await expect(
    page.getByText("Residential canine detection", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  await page.goBack();
  await expect(page.getByTestId("professional-card")).toHaveCount(1);
});

test("invalid category empty state and recoverable adapter error", async ({
  page,
}) => {
  await page.goto("/directory?category=unknown");
  await expect(
    page.getByRole("heading", { name: "Check your search" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reset search" }).click();
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  await page.goto("http://127.0.0.1:3101/directory");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "The directory couldn’t load",
  );
  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
});

test("mobile menu supports touch, keyboard, Escape, and route dismissal", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "desktop",
    "Disclosure navigation applies below 820px",
  );
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.tap();
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.press("Enter");
  await page.keyboard.press("Tab");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Home", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Find professionals" })
    .tap();
  await expect(page).toHaveURL(/directory/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("shells, screenshots, overflow, accessibility and no browser errors", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mkdir("output/playwright", { recursive: true });
  for (const [route, name] of [
    ["/", "home"],
    ["/directory", "directory"],
    ["/demo/member", "member"],
    ["/demo/admin", "admin"],
  ]) {
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    // Mobile Chromium can expand innerWidth to fit overflowing content.
    // Compare to the requested viewport, not the expanded layout viewport.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({
      path: `output/playwright/${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
  await expect(
    page.getByTestId("session-directory").getByRole("article"),
  ).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Demo workspaces" })
    .getByRole("link", { name: "Member overview" })
    .click();
  await expect(
    page.getByText("Meets sample eligibility rules", { exact: true }),
  ).toBeVisible();
});

test("public output excludes private fixtures and unpublished businesses", async ({
  request,
  page,
}) => {
  const response = await request.get("/directory");
  const html = await response.text();
  for (const privateText of [
    "synthetic-owner",
    "synthetic-customer",
    "example.invalid",
    "internalNotes",
    "Example Practice",
    "subscriptionId",
  ])
    expect(html).not.toContain(privateText);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore the directory", exact: true })
    .click();
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  await page.goto("/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This page isn’t in the preview." }),
  ).toBeVisible();
});
