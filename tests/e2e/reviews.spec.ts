import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers/demo-sign-in";
test.setTimeout(120000);
const profile = "/professionals/demo-mold-inspection";
const summary = "4.5 out of 54 published fictional reviews";
const sampleBody =
  "This fictional review describes a clear sample service discussion.";
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
  const target = /^(validation|pending)-/.test(name)
    ? ".review-submission"
    : "#reviews";
  await page.locator(target).evaluate((element) =>
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top - 110,
      behavior: "instant",
    }),
  );
  await page.screenshot({ path: `output/playwright/phase-2g1-${name}.png` });
}
async function browseProfile(page: Page, business: string) {
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Professional directory", exact: true })
    .click();
  await expect(page).toHaveURL("/directory");
  await page
    .getByRole("link", { name: `View profile for ${business}`, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(business);
}
async function fillReview(page: Page, body = sampleBody) {
  await page
    .getByLabel("Display name (sample)", { exact: true })
    .fill("Fictional Visitor");
  await page.getByLabel("Rating (sample)", { exact: true }).selectOption("4");
  await page.getByLabel("Written review (sample)", { exact: true }).fill(body);
}
async function signOut(page: Page) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Sign out", exact: true })
    .press("Enter");
}
test("published review summaries, same-profile pages, empty and long reviews stay accessible", async ({
  page,
}, info) => {
  await page.goto(
    `${profile}?returnTo=${encodeURIComponent("/directory?category=mold-inspection")}`,
  );
  await expect(page.getByTestId("review-summary")).toHaveText(summary);
  await expect(
    page
      .getByRole("list", { name: "Published fictional reviews" })
      .getByRole("article"),
  ).toHaveCount(3);
  await expect(page.getByRole("article").first()).toContainText(
    "Sample visitor Alex",
  );
  await inspect(page, `published-${info.project.name}`);
  await page
    .getByRole("link", { name: "Next reviews", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/demo-mold-inspection\?reviewPage=2.*#reviews$/);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("Sample visitor Robin");
  await expect(page.getByTestId("review-summary")).toHaveText(summary);
  await expect(
    page.getByRole("link", { name: "Back to results" }),
  ).toHaveAttribute("href", "/directory?category=mold-inspection");
  await page.goBack();
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.goto(`${profile}?reviewPage=99999`);
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.goto(`${profile}?reviewPage=2&reviewPage=1`);
  await expect(page.getByRole("article")).toHaveCount(3);
  await browseProfile(page, "Cedar Path Remediation");
  await expect(page.getByTestId("review-summary")).toHaveText("No reviews yet");
  await expect(page.getByTestId("review-summary")).not.toContainText(
    "out of 5",
  );
  await inspect(page, `empty-${info.project.name}`);
  await page.goto("/professionals/demo-healthy-designers");
  await expect(page.getByRole("article")).toContainText(
    "shared sample library",
  );
  await inspect(page, `long-${info.project.name}`);
});

test("review validation, pending confirmation and repeated clicks never publish or cause external side effects", async ({
  page,
  context,
}, info) => {
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      request.postData() ||
      /UNIQUE_REVIEW_TEXT|Fictional%20Visitor/i.test(request.url())
    )
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(profile);
  const submit = page.getByRole("button", {
    name: "Submit demo review",
    exact: true,
  });
  // Keyboard presses do not wait for the form's hydration guard to enable it.
  await expect(submit).toBeEnabled();
  await submit.press("Enter");
  await expect(
    page.getByLabel("Display name (sample)", { exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("alert").getByRole("link")).toHaveCount(3);
  await page
    .getByRole("alert")
    .getByRole("link", { name: /whole-number rating/ })
    .click();
  await expect(
    page.getByLabel("Rating (sample)", { exact: true }),
  ).toBeFocused();
  await inspect(page, `validation-${info.project.name}`);
  await page
    .getByLabel("Display name (sample)", { exact: true })
    .fill("Fictional Visitor");
  await submit.click();
  await expect(
    page.getByLabel("Rating (sample)", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Rating (sample)", { exact: true }).selectOption("3");
  await page
    .getByLabel("Written review (sample)", { exact: true })
    .fill("Too short");
  await submit.click();
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveAttribute("maxlength", "2000");
  const literal =
    "UNIQUE_REVIEW_TEXT <img src=x onerror=alert(1)> " +
    "LongFictionalText".repeat(110);
  await fillReview(page, literal);
  await page
    .getByRole("form", { name: "Try a demo review", exact: true })
    .evaluate((form) => {
      for (const [name, value] of [
        ["professionalId", "demo-pending"],
        ["status", "published"],
        ["verified", "true"],
      ]) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
    });
  await submit.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Demo review pending", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".review-confirmation")).toContainText(
    "demo-session-review-1",
  );
  await expect(page.locator(".review-confirmation")).toContainText(literal);
  await expect(page.locator(".review-confirmation img")).toHaveCount(0);
  await expect(page.getByTestId("review-summary")).toHaveText(summary);
  await expect(
    page.getByRole("list", { name: "Published fictional reviews" }),
  ).not.toContainText("UNIQUE_REVIEW_TEXT");
  await inspect(page, `pending-${info.project.name}`);
  await page.getByRole("button", { name: "Start another demo review" }).click();
  await expect(
    page.getByLabel("Display name (sample)", { exact: true }),
  ).toHaveValue("");
  await fillReview(page);
  await submit.dblclick();
  await expect(page.locator(".review-confirmation")).toContainText(
    "demo-session-review-2",
  );
  await page.getByRole("button", { name: "Start another demo review" }).click();
  await fillReview(page);
  await submit.click();
  await expect(page.locator(".review-confirmation")).toContainText(
    "demo-session-review-3",
  );
  await expect(page.getByTestId("review-summary")).toHaveText(summary);
  await page.reload();
  await expect(
    page.getByLabel("Display name (sample)", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Demo review pending", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(await context.cookies()).toEqual([]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("professional-scoped drafts survive navigation; sign-out discards drafts but keeps pending records until reset", async ({
  page,
}) => {
  await page.goto("/login");
  await signIn(page);
  await browseProfile(page, "Fern & Field Inspections");
  await fillReview(
    page,
    "Unsaved fictional review for the first professional.",
  );
  await page.getByRole("link", { name: "Next reviews", exact: true }).click();
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("Unsaved fictional review for the first professional.");
  await browseProfile(page, "Cedar Path Remediation");
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("");
  await fillReview(
    page,
    "Unsaved fictional review for the second professional.",
  );
  await browseProfile(page, "Fern & Field Inspections");
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("Unsaved fictional review for the first professional.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await signOut(page);
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("Unsaved fictional review for the first professional.");
  page.once("dialog", (dialog) => dialog.accept());
  await signOut(page);
  await expect(page).toHaveURL("/login");
  await signIn(page, "admin");
  await browseProfile(page, "Fern & Field Inspections");
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("");
  await browseProfile(page, "Cedar Path Remediation");
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("");
  await fillReview(page);
  await page
    .getByRole("button", { name: "Submit demo review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Demo review pending", exact: true }),
  ).toBeVisible();
  await signOut(page);
  await expect(page).toHaveURL("/login");
  await signIn(page);
  await browseProfile(page, "Cedar Path Remediation");
  await expect(
    page.getByRole("heading", { name: "Demo review pending", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("review-summary")).toHaveText("No reviews yet");
  await browseProfile(page, "Fern & Field Inspections");
  await fillReview(page);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reset demo session" }).click();
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue(sampleBody);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset demo session" }).click();
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("");
  await expect(page.locator("[data-demo-account]")).toHaveCount(0);
  await browseProfile(page, "Cedar Path Remediation");
  await expect(
    page.getByRole("heading", { name: "Demo review pending", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Written review (sample)", { exact: true }),
  ).toHaveValue("");
});

test("review boundaries exclude hidden seeds and structured data; no-script and prehydration forms cannot submit", async ({
  page,
  browser,
  request,
}) => {
  const forbidden =
    /REVIEW_PRIVATE|REVIEW_HIDDEN|review-private@example.invalid/;
  for (const id of [
    "pending",
    "rejected",
    "suspended",
    "inactive",
    "missing",
  ]) {
    const response = await request.get(
      `/professionals/demo-${id}?reviewPage=2`,
    );
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).not.toMatch(forbidden);
    expect(html).not.toContain('id="review-form-heading"');
  }
  const response = await request.get(profile);
  const html = await response.text();
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(html).not.toMatch(forbidden);
  expect(html).not.toContain("application/ld+json");
  const payloads: Promise<string>[] = [];
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "script" ||
      response.headers()["content-type"]?.includes("text/x-component")
    )
      payloads.push(response.text().catch(() => ""));
  });
  await page.goto(profile);
  await expect(
    page.getByRole("button", { name: "Submit demo review", exact: true }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Next reviews", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect((await Promise.all(payloads)).join("\n")).not.toMatch(forbidden);
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled });
    const noScript = await context.newPage();
    const mutations: string[] = [];
    noScript.on("request", (request) => {
      if (request.method() !== "GET" || request.postData())
        mutations.push(request.url());
    });
    if (javaScriptEnabled)
      await noScript.route("**/*.js*", (route) => route.abort());
    await noScript.goto(profile);
    await expect(noScript.getByTestId("review-summary")).toHaveText(summary);
    await expect(
      noScript.getByLabel("Display name (sample)", { exact: true }),
    ).toBeDisabled();
    await expect(
      noScript.getByRole("button", { name: "Submit demo review", exact: true }),
    ).toBeDisabled();
    await expect(
      noScript.getByRole("button", { name: "Reset demo session" }),
    ).toBeDisabled();
    await noScript
      .getByRole("link", { name: "Next reviews", exact: true })
      .click();
    await expect(noScript.getByRole("article")).toHaveCount(1);
    expect(mutations).toEqual([]);
    await context.close();
  }
});
