import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  await request.get("/reset");
});
for (const mode of ["no-script", "failed-script", "delayed-script"] as const)
  test(`${mode}: category intake remains disabled with a safe POST fallback`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
        ...info.project.use,
        javaScriptEnabled: mode !== "no-script",
      }),
      page = await context.newPage();
    let release = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    if (mode === "failed-script")
      await page.route("**/bundle.js", (r) => r.abort());
    if (mode === "delayed-script")
      await page.route("**/bundle.js", async (r) => {
        await gate;
        await r.continue();
      });
    await page.goto("/", {
      waitUntil: mode === "delayed-script" ? "commit" : "domcontentloaded",
    });
    await expect(
      page.getByLabel("New category name", { exact: true }),
    ).toBeDisabled();
    expect(new URL(page.url()).search).toBe("");
    if (mode === "delayed-script") {
      release();
      await expect(
        page.getByLabel("New category name", { exact: true }),
      ).toBeEnabled();
    } else {
      await Promise.all([
        page.waitForURL("**/api/admin/categories"),
        page
          .locator("form")
          .first()
          .evaluate((f) => (f as HTMLFormElement).submit()),
      ]);
      expect(new URL(page.url()).search).toBe("");
      await expect(page.locator("body")).toContainText(
        "native saving is unavailable",
      );
    }
    await context.close();
  });
test("stale rename keeps its draft, reload compares saved labels, explicit rebase saves without changing configuration", async ({
  page,
}, info) => {
  await page.goto("/");
  const article = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Synthetic category",
        exact: true,
      }),
    });
  await article
    .getByLabel("Category name", { exact: true })
    .fill("Renamed fixture category");
  await article.getByLabel("Reason for rename").fill("Approved test rename");
  await page.route("**/api/admin/categories", async (r) => {
    if (r.request().method() === "GET") {
      const response = await r.fetch(),
        saved = await response.json();
      return r.fulfill({
        json: {
          ...saved,
          version: 2,
          items: saved.items.map((c: { name: string }) => ({
            ...c,
            name: "Competing saved label",
          })),
        },
      });
    }
    return r.fulfill({
      status: 409,
      json: {
        error: "The saved category catalog changed. Your draft is retained.",
      },
    });
  });
  await article.getByRole("button", { name: "Save category name" }).click();
  await expect(page.getByRole("alert")).toContainText("draft is retained");
  await expect(
    article.getByLabel("Category name", { exact: true }),
  ).toHaveValue("Renamed fixture category");
  await page
    .getByRole("button", { name: "Reload saved categories, keep drafts" })
    .click();
  const updated = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Competing saved label",
        exact: true,
      }),
    });
  await expect(
    updated.getByLabel("Category name", { exact: true }),
  ).toHaveValue("Renamed fixture category");
  let body: Record<string, unknown> = {};
  await page.unroute("**/api/admin/categories");
  await page.route("**/api/admin/categories", async (r) => {
    body = r.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual([
      "action",
      "id",
      "name",
      "reason",
      "version",
    ]);
    expect(body.version).toBe(2);
    const response = await page.request.get("/api/admin/categories"),
      s = await response.json();
    return r.fulfill({
      json: {
        ...s,
        version: 3,
        saved: true,
        items: s.items.map((c: { name: string }) => ({
          ...c,
          name: body.name,
        })),
      },
    });
  });
  await updated
    .getByRole("button", {
      name: "Use current saved version, keep rename draft",
    })
    .click();
  await updated.getByRole("button", { name: "Save category name" }).click();
  await expect(page.getByRole("status")).toContainText("Category name saved");
  await expect(
    page.getByRole("heading", {
      name: "Renamed fixture category",
      exact: true,
    }),
  ).toBeVisible();
  expect(body.id).toBe("test-category");
  await expect(page.getByText(/ID: test-category/)).toContainText("123");
  await expect(page.getByText(/ID: test-category/)).toContainText(
    "membership-test-category",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `output/playwright/category-admin-${info.project.name}.jpg`,
    type: "jpeg",
    quality: 65,
  });
});
test("creation requires explicit configuration and saved names reach a pure pricing render after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Stable category ID", { exact: true })
    .fill("other-test");
  await page
    .getByLabel("New category name", { exact: true })
    .fill("Other test category");
  await page
    .getByLabel("Category description", { exact: true })
    .fill("Explicit synthetic category configuration only.");
  await page.getByLabel("New category monthly configuration (USD)").fill("321");
  await page
    .getByLabel("New category billing key")
    .fill("membership-other-test");
  await page
    .getByLabel("Reason for creation")
    .fill("Approved isolated configuration");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .press("Enter");
  await expect(page.getByRole("status")).toContainText("Category created");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Other test category", exact: true }),
  ).toBeVisible();
  await page.goto("/pricing");
  await expect(
    page.getByRole("rowheader").filter({ hasText: "Other test category" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell").filter({ hasText: "$321" }),
  ).toBeVisible();
});
