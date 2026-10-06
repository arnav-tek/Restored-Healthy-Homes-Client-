import { signIn, switchMember } from "./helpers/demo-sign-in";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { section, review, decision, resetSession } from "./helpers/dashboard";
test.setTimeout(180000);
const visitor = "Sample Consultation Visitor";
const email = "consultation-visitor@example.invalid";
const topic = "A fictional materials project. " + "LongPlainTopic".repeat(25);
const note = "ADMIN_ONLY_COORDINATION_NOTE";
async function publicPage(page: Page) {
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Consultations", exact: true })
    .click();
  await expect(page).toHaveURL("/consultations");
}
async function request(page: Page, category = "healthy-designers") {
  await page.getByLabel("Name", { exact: true }).fill(visitor);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Professional category", { exact: true })
    .selectOption(category);
  await page
    .getByLabel("Preferred format", { exact: true })
    .selectOption("video");
  await page.getByLabel("Question or topic", { exact: true }).fill(topic);
  await page.getByRole("button", { name: "Record request" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Request recorded in this tab" }),
  ).toBeVisible();
}
async function dashboard(page: Page, area: "Admin" | "Member") {
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: `${area} area`, exact: true })
    .click();
  await expect(page).toHaveURL(`/demo/${area.toLowerCase()}`);
  await signIn(page, area === "Admin" ? "admin" : "approved");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    area === "Admin"
      ? "Your directory at a glance"
      : "Your business at a glance",
  );
  await section(page, area, "Consultations");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    area === "Admin" ? "Consultation requests" : "Your demo consultations",
  );
}
async function openAdmin(page: Page, id?: string) {
  const link = page
    .getByRole("link", {
      name: id ? `Review ${id}` : /^Review demo-consultation-/,
    })
    .first();
  const href = await link.getAttribute("href");
  const selectedId = new URL(href!, "http://localhost").searchParams.get(
    "consultation",
  )!;
  await link.press("Enter");
  await expect(
    page.getByRole("heading", { name: `Request ${selectedId}`, exact: true }),
  ).toBeVisible();
  return selectedId;
}
async function assign(page: Page, provider: string, reassign = false) {
  await page
    .getByLabel("Eligible fictional professional")
    .selectOption(provider);
  await page
    .getByRole("button", {
      name: reassign ? "Reassign demo request" : "Assign demo request",
      exact: true,
    })
    .press("Enter");
}
async function memberDetail(
  page: Page,
  id: string,
  member = "member-example-approved",
) {
  await dashboard(page, "Member");
  await switchMember(page, member);
  await page.getByRole("link", { name: `Open ${id}`, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Request ${id}`, exact: true }),
  ).toBeVisible();
}
async function inspect(page: Page, name: string) {
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
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `output/playwright/phase-2f2-${name}.png`,
    fullPage: true,
  });
}
async function privateFieldsAbsent(page: Page) {
  for (const value of [visitor, email, note])
    await expect(page.locator("main")).not.toContainText(value);
  expect(page.url()).not.toMatch(
    /Visitor|example.invalid|LongPlainTopic|ADMIN_ONLY/,
  );
}
test("same-session request, assignment, member acceptance, public status, accepted changes, cancellation and reset", async ({
  page,
}, info) => {
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" || r.postData()) mutations.push(r.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/consultations");
  await request(page);
  await dashboard(page, "Admin");
  const id = await openAdmin(page);
  await page.getByLabel("Internal coordination note (optional)").fill(note);
  await page
    .getByRole("link", { name: "← Back to consultation requests", exact: true })
    .click();
  await openAdmin(page, id);
  await expect(
    page.getByLabel("Internal coordination note (optional)"),
  ).toHaveValue(note);
  await page.getByRole("button", { name: "Save demo note" }).press("Enter");
  await assign(page, "member-example-approved");
  await expect(
    page.getByText("Assigned · awaiting response", { exact: true }),
  ).toBeVisible();
  await inspect(page, `admin-detail-${info.project.name}`);
  await memberDetail(page, id);
  await privateFieldsAbsent(page);
  await switchMember(page, "member-example-coordinator");
  await expect(
    page.getByText(/This consultation is unavailable for the selected member/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept demo coordination" }),
  ).toHaveCount(0);
  await switchMember(page, "member-example-approved");
  await page
    .getByRole("button", { name: "Accept demo coordination" })
    .press("Enter");
  await expect(
    page.getByText("Accepted for demo coordination", { exact: true }),
  ).toBeVisible();
  await inspect(page, `member-accepted-${info.project.name}`);
  await publicPage(page);
  await privateFieldsAbsent(page);
  await expect(
    page.getByText("Accepted for demo coordination", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not booked", { exact: true })).toBeVisible();
  await inspect(page, `public-accepted-${info.project.name}`);
  await dashboard(page, "Admin");
  await openAdmin(page, id);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Unassign demo request" }).click();
  await expect(
    page.getByText("Accepted for demo coordination", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Unassign demo request" }).click();
  await expect(page.getByText("Requested", { exact: true })).toBeVisible();
  await assign(page, "member-example-coordinator");
  await memberDetail(page, id, "member-example-coordinator");
  await page.getByRole("button", { name: "Accept demo coordination" }).click();
  await expect(
    page.getByText("Accepted for demo coordination", { exact: true }),
  ).toBeVisible();
  await dashboard(page, "Admin");
  await openAdmin(page, id);
  page.once("dialog", (dialog) => dialog.dismiss());
  await assign(page, "member-example-approved", true);
  await expect(
    page.getByText("Assignment: Willow Sample Studio", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await assign(page, "member-example-approved", true);
  await expect(
    page.getByText("Assigned · awaiting response", { exact: true }),
  ).toBeVisible();
  await memberDetail(page, id);
  await page.getByRole("button", { name: "Accept demo coordination" }).click();
  await expect(
    page.getByText("Accepted for demo coordination", { exact: true }),
  ).toBeVisible();
  await dashboard(page, "Admin");
  await openAdmin(page, id);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Cancel demo request" }).click();
  await expect(
    page.getByText("Accepted for demo coordination", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel demo request" }).click();
  await expect(
    page.getByText("Cancelled in this demo", { exact: true }),
  ).toBeVisible();
  await publicPage(page);
  await privateFieldsAbsent(page);
  await expect(
    page.getByText("Cancelled in this demo", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Make another request" }).click();
  await request(page);
  await dashboard(page, "Admin");
  await expect(
    page.getByText("2 of 2 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  await resetSession(page, false);
  await expect(
    page.getByText("2 of 2 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  await resetSession(page);
  await expect(page).toHaveURL("/demo/admin");
  await section(page, "Admin", "Consultations");
  await expect(
    page.getByText("0 of 0 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
test("decline returns to queue; changed eligibility retains assignment, blocks acceptance and hides unowned requests", async ({
  page,
}, info) => {
  await page.goto("/consultations");
  await request(page);
  await dashboard(page, "Member");
  await expect(
    page.getByText("0 of 0 assigned demo requests shown", { exact: true }),
  ).toBeVisible();
  await dashboard(page, "Admin");
  const id = await openAdmin(page);
  await expect(
    page.getByLabel("Eligible fictional professional").locator("option"),
  ).toHaveCount(3);
  await assign(page, "member-example-approved");
  await memberDetail(page, id);
  await page.getByRole("button", { name: "Decline demo assignment" }).click();
  await expect(
    page.getByText(/This consultation is unavailable for the selected member/),
  ).toBeVisible();
  await dashboard(page, "Admin");
  await page
    .getByLabel("Assignment", { exact: true })
    .selectOption("unassigned");
  await expect(
    page.getByText("1 of 1 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  await openAdmin(page, id);
  await assign(page, "member-example-approved");
  await section(page, "Admin", "Listings");
  await review(page, "Meadow Sample Studio");
  page.once("dialog", (dialog) => dialog.accept());
  await decision(
    page,
    "suspend",
    "Fictional eligibility change for coordination.",
  );
  await expect(
    page.getByText("Suspended", { exact: true }).first(),
  ).toBeVisible();
  await section(page, "Admin", "Consultations");
  await page
    .getByRole("button", { name: "Clear consultation filters" })
    .click();
  await openAdmin(page, id);
  await expect(
    page.getByText(/Needs admin attention: the assigned member/),
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Eligible fictional professional")
      .locator('option[value="member-example-approved"]'),
  ).toHaveCount(0);
  await memberDetail(page, id);
  await expect(
    page.getByRole("button", { name: "Accept demo coordination" }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Needs admin attention: category or eligibility/),
  ).toBeVisible();
  await inspect(page, `member-attention-${info.project.name}`);
  await page.getByRole("button", { name: "Decline demo assignment" }).click();
  await dashboard(page, "Admin");
  await openAdmin(page, id);
  await expect(page.getByText("Requested", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Assignment: Unassigned", { exact: true }),
  ).toBeVisible();
});
test("filters, note drafts by request, category empty state, history and refresh/reset", async ({
  page,
}, info) => {
  await page.goto("/consultations");
  await request(page);
  await dashboard(page, "Admin");
  const first = await openAdmin(page);
  await page
    .getByLabel("Internal coordination note (optional)")
    .fill("FIRST_UNSAVED_NOTE");
  await publicPage(page);
  await page.getByRole("button", { name: "Make another request" }).click();
  await request(page, "healthy-trades");
  await dashboard(page, "Admin");
  await page.getByLabel("Consultation category").selectOption("healthy-trades");
  await expect(
    page.getByText("1 of 2 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  const second = await openAdmin(page);
  await expect(
    page.getByText(/No eligible member matches this category/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Assign demo request", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Internal coordination note (optional)"),
  ).toHaveValue("");
  await page
    .getByLabel("Internal coordination note (optional)")
    .fill("SECOND_UNSAVED_NOTE");
  await page
    .getByRole("link", { name: "← Back to consultation requests", exact: true })
    .click();
  await expect(page.getByLabel("Consultation category")).toHaveValue(
    "healthy-trades",
  );
  await page
    .getByRole("button", { name: "Clear consultation filters" })
    .click();
  await expect(
    page.getByText("2 of 2 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  await inspect(page, `admin-list-${info.project.name}`);
  await openAdmin(page, first);
  await expect(
    page.getByLabel("Internal coordination note (optional)"),
  ).toHaveValue("FIRST_UNSAVED_NOTE");
  await page.goBack();
  await expect(
    page.getByText("2 of 2 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByLabel("Internal coordination note (optional)"),
  ).toHaveValue("FIRST_UNSAVED_NOTE");
  await page
    .getByRole("link", { name: "← Back to consultation requests", exact: true })
    .click();
  await page
    .getByLabel("Request status", { exact: true })
    .selectOption("accepted");
  await expect(
    page.getByText("0 of 2 demo consultation requests shown", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear consultation filters" })
    .click();
  await openAdmin(page, second);
  await expect(
    page.getByLabel("Internal coordination note (optional)"),
  ).toHaveValue("SECOND_UNSAVED_NOTE");
  await page.reload();
  await signIn(page, "admin");
  await expect(
    page.getByText(/This consultation is unavailable in this tab/),
  ).toBeVisible();
  await publicPage(page);
  await request(page);
  await dashboard(page, "Admin");
  await openAdmin(page);
  await expect(
    page.getByLabel("Internal coordination note (optional)"),
  ).toHaveValue("");
  await page
    .getByLabel("Internal coordination note (optional)")
    .fill("RESET_UNSAVED_NOTE");
  await resetSession(page);
  await expect(page).toHaveURL("/demo/admin");
  await publicPage(page);
  await request(page);
  await dashboard(page, "Admin");
  await openAdmin(page);
  await expect(
    page.getByLabel("Internal coordination note (optional)"),
  ).toHaveValue("");
});
test("direct missing routes and no-script/prehydration dashboards fail safely without mutation controls", async ({
  page,
  browser,
  request: http,
}) => {
  for (const area of ["admin", "member"] as const) {
    const url = `/demo/${area}?section=consultations&consultation=demo-consultation-999&record=member-example-pending`;
    const response = await http.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    await page.goto(url);
    await signIn(page, area === "admin" ? "admin" : "pending");
    await expect(
      page.getByText(
        area === "admin"
          ? /This consultation is unavailable in this tab/
          : /This consultation is unavailable for the selected member/,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Assign demo request|Accept demo coordination/,
      }),
    ).toHaveCount(0);
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ javaScriptEnabled });
      const waiting = await context.newPage();
      if (javaScriptEnabled)
        await waiting.route("**/*.js*", (route) => route.abort());
      await waiting.goto(`/demo/${area}?section=consultations`);
      await expect(
        waiting.getByRole("heading", { name: "Checking demo session" }),
      ).toBeVisible();
      await expect(
        waiting.getByLabel("Request status", { exact: true }),
      ).toHaveCount(0);
      await expect(
        waiting.getByRole("button", { name: "Reset session" }),
      ).toHaveCount(0);
      await expect(
        waiting.getByRole("button", {
          name: /Assign demo request|Accept demo coordination|Save demo note/,
        }),
      ).toHaveCount(0);
      await context.close();
    }
  }
});
