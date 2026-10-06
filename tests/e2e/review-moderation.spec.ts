import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/demo-sign-in";
import { section } from "./helpers/dashboard";

test.setTimeout(150000);
const profile = "/professionals/demo-mold-inspection";
const originalSummary = "4.5 out of 54 published fictional reviews";
const updatedSummary = "4.6 out of 55 published fictional reviews";
const author = "Sample Review Walkthrough";
const body =
  "Fictional service discussion <img src=x onerror=alert(1)> " +
  "LongSampleReview".repeat(35);
const note = "INTERNAL_REVIEW_NOTE_ONLY";
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
    path: `output/playwright/phase-2g2-${name}.png`,
    fullPage: true,
  });
}
async function workspace(
  page: Page,
  area: "Admin" | "Member",
  account = area === "Admin" ? "admin" : "fern",
) {
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: `${area} area`, exact: true })
    .press("Enter");
  await expect(page).toHaveURL(`/demo/${area.toLowerCase()}`);
  await signIn(page, account);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    area === "Admin"
      ? "Your directory at a glance"
      : "Your business at a glance",
  );
  await section(page, area, "Reviews");
}
async function filter(
  page: Page,
  status = "all",
  professional = "demo-mold-inspection",
) {
  await page.getByLabel("Review status", { exact: true }).selectOption(status);
  await page
    .getByLabel("Professional", { exact: true })
    .selectOption(professional);
  await page
    .getByRole("button", { name: "Filter reviews", exact: true })
    .press("Enter");
  const params = new URLSearchParams({ section: "reviews" });
  if (status !== "all") params.set("reviewStatus", status);
  if (professional) params.set("professional", professional);
  await expect(page).toHaveURL(`/demo/admin?${params}`);
}
async function openReview(page: Page, name = author) {
  await page
    .getByRole("link", { name: `Review by ${name}`, exact: true })
    .press("Enter");
  await expect(
    page.getByRole("article", { name: "Review detail" }),
  ).toBeVisible();
}
async function reject(page: Page, accept: boolean) {
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("rating contribution");
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
  await page
    .getByRole("button", { name: "Reject review", exact: true })
    .press("Enter");
}
async function publicPreview(page: Page) {
  await page
    .getByRole("link", { name: "View public review preview", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(`${profile}#reviews`);
  await expect(page.locator("main")).not.toContainText(note);
}
async function summary(page: Page, value: string) {
  await expect(page.getByTestId("review-summary")).toHaveText(value);
}

test("review walkthrough publishes across accounts, rejects with confirmation and keeps visitor status and ratings coherent", async ({
  page,
  context,
}, info) => {
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(profile);
  await page.getByLabel("Display name (sample)", { exact: true }).fill(author);
  await page.getByLabel("Rating (sample)", { exact: true }).selectOption("5");
  await page.getByLabel("Written review (sample)", { exact: true }).fill(body);
  await page
    .getByRole("button", { name: "Submit demo review", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Demo review pending", exact: true }),
  ).toBeFocused();
  await summary(page, originalSummary);
  await workspace(page, "Admin");
  await filter(page, "pending");
  await inspect(page, `queue-${info.project.name}`);
  await openReview(page);
  const noteField = page.getByLabel("Internal review note (optional)");
  await noteField.evaluate((element) => element.removeAttribute("maxlength"));
  await noteField.fill("x".repeat(501));
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .press("Enter");
  await expect(noteField).toBeFocused();
  await expect(noteField).toHaveAttribute("aria-invalid", "true");
  await inspect(page, `validation-${info.project.name}`);
  await noteField.fill(note);
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .press("Enter");
  await expect(page.getByTestId("moderation-review-status")).toHaveText(
    "published",
  );
  await expect(
    page.getByText(
      "Demo review published. This decision affects only this tab.",
      { exact: true },
    ),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .press("Enter");
  await expect(
    page.getByText("Already published. No change to this demo review.", {
      exact: true,
    }),
  ).toBeFocused();
  await inspect(page, `detail-${info.project.name}`);
  await publicPreview(page);
  await summary(page, updatedSummary);
  await expect(
    page.getByRole("heading", { name: "Demo review published", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Published fictional reviews" })
      .getByRole("article")
      .first(),
  ).toContainText(body);
  await expect(page.locator(".review-body img")).toHaveCount(0);
  await workspace(page, "Member");
  await summary(page, updatedSummary);
  await expect(
    page
      .getByRole("list", { name: "Published fictional reviews" })
      .getByRole("article"),
  ).toHaveCount(5);
  await expect(page.locator("main")).not.toContainText(note);
  await expect(
    page.getByRole("button", { name: "Publish review", exact: true }),
  ).toHaveCount(0);
  await inspect(page, `member-${info.project.name}`);
  await workspace(page, "Admin");
  await openReview(page);
  await reject(page, false);
  await expect(page.getByTestId("moderation-review-status")).toHaveText(
    "published",
  );
  await reject(page, true);
  await expect(page.getByTestId("moderation-review-status")).toHaveText(
    "rejected",
  );
  await publicPreview(page);
  await summary(page, originalSummary);
  await expect(
    page.getByRole("heading", { name: "Demo review rejected", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Published fictional reviews" }),
  ).not.toContainText(author);
  await workspace(page, "Member");
  await summary(page, originalSummary);
  await expect(page.locator("main")).not.toContainText(author);
  await workspace(page, "Admin");
  await filter(page, "rejected");
  await openReview(page);
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .press("Enter");
  await publicPreview(page);
  await summary(page, updatedSummary);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reset demo session" }).press("Enter");
  await summary(page, updatedSummary);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset demo session" }).press("Enter");
  await summary(page, originalSummary);
  await expect(page.locator(".review-confirmation")).toHaveCount(0);
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(await context.cookies()).toEqual([]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
  expect(page.url()).not.toContain(note);
});

test("review filters, missing records, isolated moderation drafts and member ownership stay within the selected account", async ({
  page,
}, info) => {
  await page.goto("/demo/admin?section=reviews&review=missing");
  await expect(
    page.getByRole("heading", { name: "Demo sign-in required" }),
  ).toBeVisible();
  await signIn(page, "admin");
  await expect(page.getByText(/This review is unavailable/)).toBeVisible();
  await page
    .getByRole("link", { name: "Back to reviews queue" })
    .press("Enter");
  await filter(page, "pending");
  await expect(page.getByText(/No reviews match/)).toBeVisible();
  await filter(page, "published");
  const filteredUrl = page.url();
  await expect(page.locator(".review-queue li")).toHaveCount(4);
  await openReview(page, "Sample visitor Alex");
  await page
    .getByLabel("Internal review note (optional)")
    .fill("DRAFT_REVIEW_A");
  await section(page, "Admin", "Overview");
  await page.goBack();
  await expect(page.getByLabel("Internal review note (optional)")).toHaveValue(
    "DRAFT_REVIEW_A",
  );
  await page
    .getByRole("link", { name: "Back to reviews queue" })
    .press("Enter");
  await expect(page).toHaveURL(filteredUrl);
  await openReview(page, "Sample visitor Jordan");
  await expect(page.getByLabel("Internal review note (optional)")).toHaveValue(
    "",
  );
  await page
    .getByLabel("Internal review note (optional)")
    .fill("DRAFT_REVIEW_B");
  await page
    .getByRole("link", { name: "Back to reviews queue" })
    .press("Enter");
  await openReview(page, "Sample visitor Alex");
  await expect(page.getByLabel("Internal review note (optional)")).toHaveValue(
    "DRAFT_REVIEW_A",
  );
  await page.goBack();
  await expect(page).toHaveURL(filteredUrl);
  await page.goForward();
  await expect(page.getByLabel("Internal review note (optional)")).toHaveValue(
    "DRAFT_REVIEW_A",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Switch demo account", exact: true })
    .press("Enter");
  await expect(page.getByLabel("Internal review note (optional)")).toHaveValue(
    "DRAFT_REVIEW_A",
  );
  await signIn(page, "fern");
  await section(page, "Member", "Reviews");
  await expect(page.locator("main")).not.toContainText("DRAFT_REVIEW");
  await workspace(page, "Admin");
  await openReview(page, "Sample visitor Alex");
  await expect(page.getByLabel("Internal review note (optional)")).toHaveValue(
    "",
  );
  await page
    .getByRole("link", { name: "Back to reviews queue" })
    .press("Enter");
  await openReview(page, "Sample visitor Jordan");
  await expect(page.getByLabel("Internal review note (optional)")).toHaveValue(
    "",
  );
  await workspace(page, "Member", "approved");
  await expect(
    page.getByRole("heading", {
      name: "No public professional linked to this demo account",
    }),
  ).toBeVisible();
  await inspect(page, `unlinked-${info.project.name}`);
  await page.goto(
    "/demo/member?section=reviews&professional=demo-mold-inspection&review=sample-inspection-plan&record=member-example-fern",
  );
  await signIn(page, "cedar");
  await expect(page).toHaveURL("/demo/member?section=reviews");
  await summary(page, "No reviews yet");
  await expect(page.locator("main")).not.toContainText("Sample visitor Alex");
  await inspect(page, `empty-member-${info.project.name}`);
  await page.goto(
    "/demo/admin?section=reviews&professional=missing&reviewStatus=published",
  );
  await signIn(page, "admin");
  await expect(page.getByLabel("Professional", { exact: true })).toHaveValue(
    "missing",
  );
  await expect(page.getByText(/No reviews match/)).toBeVisible();
  await page
    .getByRole("button", { name: "Clear review filters" })
    .press("Enter");
  await expect(page.locator(".review-queue li")).toHaveCount(6);
});

test("seed rejection clamps public pagination, preserves result returns and restores honest empty states on reset", async ({
  page,
}, info) => {
  const returnTo = "/directory?category=mold-inspection";
  const startUrl = `${profile}?reviewPage=2&returnTo=${encodeURIComponent(returnTo)}`;
  await page.goto(startUrl);
  await expect(page.getByRole("article")).toHaveCount(1);
  await workspace(page, "Admin");
  await openReview(page, "Sample visitor Alex");
  await reject(page, true);
  // Account gates add a history entry; walk back through the real client journey.
  for (
    let step = 0;
    step < 5 && new URL(page.url()).pathname !== profile;
    step++
  )
    await page.goBack();
  await expect(page).toHaveURL(startUrl);
  await summary(page, "4.3 out of 53 published fictional reviews");
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(
    page.getByRole("navigation", { name: "Review pages" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to results" }),
  ).toHaveAttribute("href", returnTo);
  await workspace(page, "Admin");
  await filter(page, "published");
  for (let remaining = 3; remaining > 0; remaining--) {
    await expect(page.locator(".review-queue li")).toHaveCount(remaining);
    await page
      .getByRole("link", { name: /^Review by / })
      .first()
      .press("Enter");
    await reject(page, true);
    await page
      .getByRole("link", { name: "Back to reviews queue" })
      .press("Enter");
  }
  await expect(page.getByText(/No reviews match/)).toBeVisible();
  await inspect(page, `empty-queue-${info.project.name}`);
  await workspace(page, "Member");
  await summary(page, "No reviews yet");
  await page
    .getByRole("link", { name: "View your public review preview", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(`${profile}#reviews`);
  await summary(page, "No reviews yet");
  await expect(page.getByTestId("review-summary")).not.toContainText(
    "out of 5",
  );
  await page.reload();
  await summary(page, originalSummary);
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
});

test("review moderation boundaries keep hidden seeds and controls out of server, no-script and prehydration views", async ({
  page,
  browser,
  request,
}) => {
  const forbidden =
    /REVIEW_PRIVATE|REVIEW_HIDDEN|review-private@example.invalid/;
  for (const path of [
    profile,
    "/demo/admin?section=reviews",
    "/demo/member?section=reviews",
  ]) {
    const response = await request.get(path);
    const html = await response.text();
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(html).not.toMatch(forbidden);
    expect(html).not.toContain('id="review-internal-note"');
    expect(html).not.toContain("application/ld+json");
  }
  const payloads: Promise<string>[] = [];
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "script" ||
      response.headers()["content-type"]?.includes("text/x-component")
    )
      payloads.push(response.text().catch(() => ""));
  });
  await page.goto("/login");
  await signIn(page, "admin");
  await section(page, "Admin", "Reviews");
  await openReview(page, "Sample visitor Alex");
  await page.getByLabel("Internal review note (optional)").fill(note);
  await page
    .getByRole("button", { name: "Publish review", exact: true })
    .press("Enter");
  await publicPreview(page);
  expect((await Promise.all(payloads)).join("\n")).not.toMatch(forbidden);
  expect(await (await request.get(profile)).text()).not.toContain(note);
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled });
    const offline = await context.newPage();
    const mutations: string[] = [];
    offline.on("request", (r) => {
      if (r.method() !== "GET" || r.postData()) mutations.push(r.url());
    });
    if (javaScriptEnabled)
      await offline.route("**/*.js*", (route) => route.abort());
    await offline.goto(profile);
    await summary(offline, originalSummary);
    await expect(
      offline.getByRole("button", { name: "Submit demo review", exact: true }),
    ).toBeDisabled();
    await expect(offline.locator(".review-stars").first()).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    for (const area of ["admin", "member"]) {
      await offline.goto(`/demo/${area}?section=reviews`);
      await expect(
        offline.getByRole("heading", { name: "Checking demo session" }),
      ).toBeVisible();
      await expect(
        offline.getByRole("button", { name: "Publish review", exact: true }),
      ).toHaveCount(0);
      await expect(offline.locator(".review-list")).toHaveCount(0);
    }
    expect(mutations).toEqual([]);
    await context.close();
  }
});
