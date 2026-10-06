import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("filtered search to profile and local inquiry, validation, reset and return", async ({
  page,
}, testInfo) => {
  const results =
    "/directory?q=ventilation&category=healthy-trades&location=27601&radius=250&sort=nearest";
  await page.goto(results);
  await page
    .getByRole("link", { name: "View profile for Willow Home Trades" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Willow Home Trades",
  );
  await expect(
    page.getByRole("link", { name: "Back to results" }),
  ).toHaveAttribute("href", results);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Back to results" }),
  ).toHaveAttribute("href", results);
  await expect(page.getByText(/Use sample information only/)).toBeVisible();
  await expect(page.getByLabel("Name (sample)", { exact: true })).toBeEnabled();
  await page
    .getByRole("button", { name: "Preview demo inquiry" })
    .press("Enter");
  await expect(page.getByLabel("Name (sample)", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Email (sample)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Message (sample)")).toHaveAttribute(
    "aria-invalid",
    "true",
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
    path: `output/playwright/profile-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(testInfo.project.use.viewport!.width);
  await page
    .getByLabel("Name (sample)", { exact: true })
    .fill("Sample Homeowner");
  await page.getByLabel("Email (sample)").fill("invalid-email");
  await page.getByLabel("Message (sample)").fill("Short");
  await page.getByRole("button", { name: "Preview demo inquiry" }).click();
  await expect(page.getByLabel("Email (sample)")).toBeFocused();
  await expect(
    page.getByText("Enter at least 10 characters for your sample message."),
  ).toBeVisible();
  await page.getByLabel("Email (sample)").fill("homeowner@example.invalid");
  await page
    .getByLabel("Message (sample)")
    .fill("A fictional ventilation project inquiry.");
  const requests: string[] = [];
  page.on("request", (request) =>
    requests.push(
      `${request.method()} ${request.url()} ${request.postData() ?? ""}`,
    ),
  );
  const before = page.url();
  await page
    .getByRole("button", { name: "Preview demo inquiry" })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Demo inquiry complete" }),
  ).toBeFocused();
  await expect(
    page.getByText(/no professional will receive a message/),
  ).toBeVisible();
  expect(page.url()).toBe(before);
  expect(
    requests.some((request) =>
      /POST|homeowner%40|homeowner@example|fictional.ventilation/i.test(
        request,
      ),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/inquiry-confirmation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start another demo inquiry" })
    .click();
  await expect(page.getByLabel("Name (sample)", { exact: true })).toBeFocused();
  for (const label of ["Name (sample)", "Email (sample)", "Message (sample)"])
    await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:3100${results}`);
  await expect(page.getByLabel("City or ZIP code")).toHaveValue("27601");
});

test("all category profiles are public-only; hidden and missing direct routes reveal no status", async ({
  page,
  request,
}) => {
  const categories = [
    "mold-inspection",
    "mold-remediation",
    "healthy-renovations",
    "healthy-builders",
    "healthy-trades",
    "healthy-designers",
    "health-practitioners",
    "mold-detection-dogs",
  ];
  for (const category of categories) {
    const response = await request.get(`/professionals/demo-${category}`);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const html = await response.text();
    expect(html).toContain("Sample professional profile");
    for (const marker of [
      "synthetic-owner",
      "synthetic-customer",
      "internalNotes",
      "member-0@example.invalid",
      "application/ld+json",
    ])
      expect(html).not.toContain(marker);
  }
  for (const id of [
    "pending",
    "rejected",
    "suspended",
    "inactive",
    "past-due",
    "canceled",
    "trialing",
    "unpaid",
    "missing",
  ]) {
    const response = await request.get(`/professionals/demo-${id}`);
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toContain("Profile not found");
    expect(html).not.toContain("Example Practice");
    expect(html).not.toContain("Sample professional profile");
    expect(html).not.toContain("inquiry-message");
    expect(html).not.toContain("synthetic-owner");
  }
  await page.goto("/professionals/demo-mold-remediation");
  await expect(
    page.getByText("Listed credentials (unverified)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No verified credentials are shown."),
  ).toBeVisible();
  await expect(
    page.getByText(/No public contact details have been provided/),
  ).toBeVisible();
  await page.goto("/professionals/demo-mold-inspection");
  await expect(
    page.getByText("Verified credentials (demo)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("hello@fern-field.example.invalid", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Fern & Field Inspections.*Demo profile/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("unsafe or absent return destinations use directory fallback; adapter failure is recoverable", async ({
  page,
}) => {
  for (const returnTo of [
    "",
    "https://evil.invalid",
    "//evil.invalid",
    "/demo/admin",
    "/directory?category=unknown",
    "/directory?q=x&q=y",
  ]) {
    await page.goto(
      `/professionals/demo-healthy-builders?${new URLSearchParams({ returnTo })}`,
    );
    await expect(
      page.getByRole("link", { name: "Back to directory" }),
    ).toHaveAttribute("href", "/directory");
  }
  await page.goto("/professionals/demo-healthy-builders");
  await expect(page.getByText(/Service area not provided/)).toBeVisible();
  await page.goto("http://127.0.0.1:3101/professionals/demo-healthy-builders");
  await expect(
    page.getByRole("heading", { name: "The profile couldn’t load" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open directory" }),
  ).toHaveAttribute("href", "/directory");
});

test("without JavaScript profiles work and inquiry cannot send native form data", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/professionals/demo-mold-inspection");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Fern & Field Inspections",
    );
    await expect(
      page.getByText(/Enable JavaScript to try this local demo form/),
    ).toBeVisible();
    await expect(
      page.getByLabel("Name (sample)", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Preview demo inquiry" }),
    ).toBeDisabled();
    await page.getByRole("link", { name: "Back to directory" }).click();
    await expect(page).toHaveURL(/\/directory$/);
  } finally {
    await context.close();
  }
});
