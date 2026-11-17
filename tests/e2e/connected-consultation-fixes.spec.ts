import { test, expect, type Page } from "@playwright/test";
async function fill(page: Page) {
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Synthetic visitor");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("synthetic@example.invalid");
  await page
    .getByRole("combobox", { name: "Professional category" })
    .selectOption("mold-inspection");
  await page
    .getByRole("textbox", { name: "What would you like to discuss?" })
    .fill("Synthetic consultation question for regression only.");
}
for (const mode of ["no-script", "failed-script", "delayed-script"] as const)
  test(`${mode}: intake stays disabled and native fallback never puts fields in URLs`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      ...info.project.use,
      javaScriptEnabled: mode !== "no-script",
    });
    const page = await context.newPage();
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST") posts++;
    });
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    if (mode === "failed-script")
      await page.route("**/bundle.js", (route) => route.abort());
    if (mode === "delayed-script")
      await page.route("**/bundle.js", async (route) => {
        await gate;
        await route.continue();
      });
    await page.goto("/", {
      waitUntil: mode === "delayed-script" ? "commit" : "domcontentloaded",
    });
    await expect(
      page.getByRole("textbox", { name: "Your name", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Send request", exact: true }),
    ).toBeDisabled();
    if (mode === "no-script")
      expect(
        await page.locator("noscript").evaluate((el) => el.textContent),
      ).toContain("JavaScript is required");
    expect(new URL(page.url()).search).toBe("");
    expect(posts).toBe(0);
    if (mode === "delayed-script") {
      release();
      await expect(
        page.getByRole("textbox", { name: "Your name", exact: true }),
      ).toBeEnabled();
    } else {
      // Even forced native submission uses POST to a JSON-only endpoint, not GET.
      await Promise.all([
        page.waitForURL("**/api/consultations"),
        page
          .locator("form")
          .evaluate((form) => (form as HTMLFormElement).submit()),
      ]);
      expect(new URL(page.url()).search).toBe("");
      await expect(page.locator("body")).toContainText(
        "native submission is unavailable",
      );
    }
    await context.close();
  });
test("hydrated JSON retry preserves draft and capability; cancellation includes displayed ID/version", async ({
  page,
}) => {
  let attempts = 0;
  const submissions: Record<string, unknown>[] = [];
  let receipt: Record<string, unknown> | null = null;
  await page.route("**/api/consultations", async (route) => {
    const request = route.request();
    if (request.method() === "GET")
      return route.fulfill({
        status: receipt ? 200 : 404,
        json: receipt ?? { error: "No receipt" },
      });
    const body = request.postDataJSON();
    if (request.method() === "POST") {
      submissions.push(body);
      if (++attempts === 1) return route.abort();
      receipt = {
        requestId: body.requestId,
        status: "requested",
        version: 1,
        categoryId: "mold-inspection",
      };
      return route.fulfill({ json: { saved: true } });
    }
    expect(body).toEqual({ requestId: receipt!.requestId, version: 1 });
    receipt = { ...receipt, status: "cancelled", version: 2 };
    return route.fulfill({ json: receipt });
  });
  await page.goto("/");
  await fill(page);
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("draft is retained");
  await expect(
    page.getByRole("textbox", { name: "Your name", exact: true }),
  ).toHaveValue("Synthetic visitor");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your latest saved request" }),
  ).toBeVisible();
  expect(submissions[0]).toEqual(submissions[1]);
  expect(String(submissions[0].token)).toMatch(/^[a-f0-9]{64}$/);
  expect(new URL(page.url()).search).toBe("");
  await page
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, cancel request" }).click();
  await expect(page.getByRole("alert")).toHaveText("Request cancelled.");
});
test("participation persists reloads, preserves stale choices and requires explicit version reload", async ({
  page,
}, info) => {
  let saved = { enabled: false, version: 1 };
  let stale = true;
  await page.route("**/api/member/consultation-preference", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: saved });
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(["enabled", "version"]);
    if (stale) {
      stale = false;
      saved = { enabled: false, version: 2 };
      return route.fulfill({
        status: 409,
        json: {
          error:
            "Saved profile changed. Compare and reload; your draft is retained.",
        },
      });
    }
    expect(body.version).toBe(2);
    saved = { enabled: body.enabled, version: 3 };
    return route.fulfill({ json: { ...saved, saved: true } });
  });
  await page.goto("/participation");
  const checkbox = page.getByRole("checkbox", {
    name: "Offer free phone consultations",
  });
  await checkbox.check();
  await page
    .getByRole("button", {
      name: "Save consultation participation",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("draft is retained");
  await expect(checkbox).toBeChecked();
  await page
    .getByRole("button", {
      name: "Reload saved version, keep participation choice",
    })
    .click();
  await expect(page.getByRole("status")).toContainText("version 2");
  await expect(checkbox).toBeChecked();
  await page
    .getByRole("button", {
      name: "Save consultation participation",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("participation saved");
  await page.reload();
  await expect(checkbox).toBeChecked();
  await expect(
    page.getByText("Saved preference:", { exact: false }),
  ).toContainText("version 3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `output/playwright/consultation-fixes-preference-${info.project.name}.jpg`,
    type: "jpeg",
    quality: 65,
  });
});
test("42 requests: query navigation, history, late refresh and drafts stay with their record/version", async ({
  page,
}, info) => {
  await page.goto("/workspace");
  const card = (topic: string) =>
    page
      .locator("article")
      .filter({ has: page.getByText(topic, { exact: true }) });
  const first = card("Synthetic consultation 1");
  await first.getByRole("textbox").fill("Private page one draft");
  await first
    .getByRole("combobox")
    .selectOption("00000000-0000-4000-8000-999999999999");
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let refreshUrl = "";
  await page.route("**/api/admin/consultations?*", async (route) => {
    refreshUrl = route.request().url();
    if (refreshUrl.endsWith("page=1")) {
      await gate;
      await route.fulfill({
        json: { page: 1, hasNext: true, candidates: [], items: [] },
      });
    } else
      await route.fulfill({
        json: { page: 2, hasNext: true, candidates: [], items: [] },
      });
  });
  await page.getByRole("button", { name: "Refresh saved requests" }).click();
  await expect.poll(() => refreshUrl).toContain("page=1");
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(card("Synthetic consultation 21")).toBeVisible();
  const lateResponse = page.waitForResponse((response) =>
    response.url().endsWith("page=1"),
  );
  release();
  await (await lateResponse).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(card("Synthetic consultation 21")).toBeVisible();
  await page.goBack();
  await expect(first.getByRole("textbox")).toHaveValue(
    "Private page one draft",
  );
  await expect(first.getByRole("combobox")).toHaveValue(
    "00000000-0000-4000-8000-999999999999",
  );
  await page.goForward();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Refresh saved requests" }).click();
  await expect.poll(() => refreshUrl).toContain("page=2");
  await expect(
    page.getByText("No consultation requests on this page."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Previous", exact: true }).click();
  await expect(first.getByRole("textbox")).toHaveValue(
    "Private page one draft",
  );
  let sent: Record<string, unknown> = {};
  await page.route("**/api/admin/consultations", (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({
      status: 409,
      json: { error: "Saved version changed; draft retained." },
    });
  });
  await first.getByRole("button", { name: "Save note" }).click();
  await expect(first.getByRole("status")).toContainText("draft retained");
  expect(sent.id).toBe("00000000-0000-4000-8000-000000000001");
  expect(sent.version).toBe(1);
  await expect(first.getByRole("textbox")).toHaveValue(
    "Private page one draft",
  );
  await page.screenshot({
    path: `output/playwright/consultation-fixes-workspace-${info.project.name}.jpg`,
    type: "jpeg",
    quality: 65,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Same route with a new authenticated identity/scope must reset private state.
  await page.evaluate(() => {
    history.pushState(null, "", "?page=1&identity=b");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(first.getByRole("textbox")).toHaveValue("");
  await page.evaluate(() => {
    history.pushState(null, "", "?page=1&scope=member");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.goto("/workspace?page=3");
  await expect(card("Synthetic consultation 41")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Next", exact: true }),
  ).toHaveCount(0);
});

test("saved record updates never silently upgrade a private draft version", async ({
  page,
}) => {
  await page.goto("/workspace");
  const first = page
    .locator("article")
    .filter({
      has: page.getByText("Synthetic consultation 1", { exact: true }),
    });
  await first.getByRole("textbox").fill("Keep my original private note");
  const item = {
    id: "00000000-0000-4000-8000-000000000001",
    version: 3,
    categoryId: "mold-inspection",
    topic: "Synthetic consultation 1",
    format: "phone",
    status: "requested",
    professionalId: null,
    createdAt: "2026-11-15T00:00:00Z",
    name: "Synthetic",
    email: "fixture@example.invalid",
    note: "Different saved note",
  };
  await page.route("**/api/admin/consultations?*", (route) =>
    route.fulfill({
      json: { page: 1, hasNext: true, candidates: [], items: [item] },
    }),
  );
  const versions: number[] = [];
  await page.route("**/api/admin/consultations", (route) => {
    versions.push(route.request().postDataJSON().version);
    return route.fulfill({
      status: 409,
      json: { error: "Compare saved state; draft retained." },
    });
  });
  await page.getByRole("button", { name: "Refresh saved requests" }).click();
  await expect(
    first.getByText("Saved version 3.", { exact: false }),
  ).toBeVisible();
  await first.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(first.getByRole("status")).toContainText("draft retained");
  expect(versions).toEqual([1]);
  await expect(first.getByRole("textbox")).toHaveValue(
    "Keep my original private note",
  );
  await first
    .getByRole("button", { name: "Use current saved version, keep draft" })
    .click();
  await first.getByRole("button", { name: "Save note", exact: true }).click();
  await expect.poll(() => versions.length).toBe(2);
  expect(versions).toEqual([1, 3]);
  // A failed server page must not unmount the identity-scoped draft store.
  await page.evaluate(() => {
    history.pushState(null, "", "?page=2&fail=1");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("alert")).toHaveText(
    "Synthetic server page failure",
  );
  await page.goBack();
  await expect(first.getByRole("textbox")).toHaveValue(
    "Keep my original private note",
  );
});
