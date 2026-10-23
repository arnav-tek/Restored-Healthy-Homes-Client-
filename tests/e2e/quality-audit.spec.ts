import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mainNav } from "./helpers/application";
import { visitWorkspace } from "./helpers/demo-sign-in";

async function accessible(page: Page) {
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
}

test("keyboard skip link, mobile escape and public form errors preserve focus", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/resources");
  await expect(page.getByLabel("Email address", { exact: true })).toBeEnabled();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) {
    await menu.press("Enter");
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
    // Mobile WebKit's default Tab preference skips ordinary links. Exercise
    // Escape from an explicitly focused navigation descendant in every engine.
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Find Specialists", exact: true })
      .press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
  }
  await page.getByRole("button", { name: "Preview signup" }).press("Enter");
  await expect(page.getByLabel("Email address", { exact: true })).toBeFocused();
  await expect(
    page.getByLabel("Email address", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("reader@example.invalid");
  await page.getByRole("button", { name: "Preview signup" }).press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Signup preview complete" }),
  ).toBeFocused();
  await accessible(page);
  await page.screenshot({
    path: `output/playwright/quality-resources-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("profile sample can be removed and the same file selected again", async ({
  page,
}) => {
  await visitWorkspace(page, "/demo/member?section=profile");
  const input = page.getByLabel("Choose a sample business photo");
  const sample = {
    name: "sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  };
  await input.setInputFiles(sample);
  await expect(page.getByAltText("Local business photo preview")).toBeVisible();
  await page
    .getByRole("button", { name: "Remove sample photo" })
    .press("Enter");
  await expect(page.getByAltText("Local business photo preview")).toHaveCount(
    0,
  );
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await input.setInputFiles(sample);
  await expect(page.getByAltText("Local business photo preview")).toBeVisible();
});

test("static hero requests one optimized poster and no video", async ({
  page,
}) => {
  const originalPosters: string[] = [];
  const videos: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/media/demo-home-interior.jpg") originalPosters.push(path);
    if (path === "/media/demo-home-interior.mp4") videos.push(path);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /background video/ }),
  ).toHaveCount(0);
  const poster = page.locator(".hero-video-backdrop img");
  await expect
    .poll(() =>
      poster.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  expect(originalPosters).toEqual([]);
  expect(videos).toEqual([]);
});

test("unknown links, empty search and missing session resources offer recovery", async ({
  page,
}, info) => {
  const response = await page.goto("/missing-quality-audit-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/directory?q=no-matching-fictional-company");
  await expect(page.getByTestId("professional-card")).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(/no .*found|no .*match/i);
  await accessible(page);
  await page.goto("/resources/demo-article-999999");
  await expect(
    page.getByRole("heading", { name: "Resource unavailable", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to resources", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/resources");
  await mainNav(page, "Find Specialists");
  await expect(page.getByTestId("professional-card")).toHaveCount(6);
  await accessible(page);
  await page.screenshot({
    path: `output/playwright/quality-directory-${info.project.name}.png`,
    fullPage: true,
  });
});

test("analytics month selection and narrow layout work across engines", async ({
  page,
}, info) => {
  await visitWorkspace(page, "/demo/admin?section=analytics");
  const month = page.getByLabel("Application month (UTC)");
  if (
    (await month.evaluate((input: HTMLInputElement) => input.type)) === "text"
  ) {
    await month.press("ControlOrMeta+A");
    await month.pressSequentially("2000-01");
  } else {
    await month.fill("2000-01");
  }
  await expect(page.getByLabel("Application month (UTC)")).toHaveValue(
    "2000-01",
  );
  await expect(page.getByRole("definition").nth(3)).toHaveText("0");
  await month.fill("");
  await expect(month).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("definition").nth(3)).toHaveText("—");
  await month.fill("2000-01");
  await expect(month).toHaveAttribute("aria-invalid", "false");
  await accessible(page);
  await page.screenshot({
    path: `output/playwright/quality-analytics-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".admin-month-filter")
    .screenshot({
      path: `output/playwright/quality-month-field-${info.project.name}.png`,
    });
});
