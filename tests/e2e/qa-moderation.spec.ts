import { signIn, switchMember, visitWorkspace } from "./helpers/demo-sign-in";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { section, resetSession } from "./helpers/dashboard";
async function admin(page: Page) {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your directory at a glance",
  );
  await expect(
    page.getByRole("button", { name: "Reset workspace" }),
  ).toBeEnabled();
  await section(page, "Admin", "Q&A");
}
async function member(page: Page) {
  await page.getByRole("link", { name: "Member area", exact: true }).click();
  await expect(page).toHaveURL("/demo/member");
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your business at a glance",
  );
  await expect(
    page.getByRole("button", { name: "Reset workspace" }),
  ).toBeEnabled();
  await section(page, "Member", "Q&A");
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
    path: `output/playwright/phase-2e2-${name}.png`,
    fullPage: true,
  });
}
test("Q&A filters cannot submit a stale queue while delayed queue navigation is pending", async ({ page }) => {
  test.setTimeout(90000);
  let released = false;
  let release = () => {};
  let intercepted = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const requested = new Promise<void>((resolve) => { intercepted = resolve; });
  await page.route("**/demo/admin?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("queue") === "answers" && !released) {
      intercepted();
      await gate;
    }
    await route.continue();
  });
  try {
    await page.goto("/demo/admin?section=qa");
    await signIn(page, "admin");
    const answers = page.getByRole("navigation", { name: "Q&A queues" })
      .getByRole("link", { name: /^Answers/ });
    await answers.click();
    await requested;
    await expect(page.getByLabel("Publication status")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Filter Q&A", exact: true })).toBeDisabled();
    released = true;
    release();
    await expect(answers).toHaveAttribute("aria-current", "page");
    await page.getByLabel("Publication status").selectOption("pending");
    await page.getByRole("button", { name: "Filter Q&A", exact: true }).click();
    await expect(page).toHaveURL(/queue=answers.*qaStatus=pending/);
    await expect(page.getByText("0 matching answers", { exact: true })).toBeVisible();
  } finally {
    released = true;
    release();
  }
});

test("session publications can add a third public results page without server clamping", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await page.goto("/questions/ask");
  for (let index = 1; index <= 3; index++) {
    if (index > 1) {
      await page
        .getByRole("link", { name: "Ask a question", exact: true })
        .click();
      await page.getByRole("button", { name: "Ask another question" }).click();
    }
    const title = `Zzz fictional pagination question ${index}`;
    await page.getByLabel("Question title", { exact: true }).fill(title);
    await page
      .getByLabel("Relevant category")
      .selectOption("healthy-designers");
    await page
      .getByLabel("Question text", { exact: true })
      .fill("A sample planning question for a fictional design project.");
    await page.getByRole("button", { name: "Submit question" }).click();
    await admin(page);
    await page
      .getByRole("link", { name: `Review ${title}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish question", exact: true })
      .click();
    await page
      .getByRole("link", { name: "View public session question" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await page
      .getByRole("link", { name: /Back to questions/ })
      .first()
      .click();
    await expect(page).toHaveURL("/questions");
  }
  await expect(page.getByText("Showing 1–6 of 13 questions")).toBeVisible();
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL("/questions?page=3");
  await expect(page.getByText("Showing 13–13 of 13 questions")).toBeVisible();
  await page
    .getByRole("link", {
      name: /Zzz fictional pagination question 3/,
    })
    .click();
  await page
    .getByRole("link", { name: /Back to questions/ })
    .first()
    .click();
  await expect(page).toHaveURL("/questions?page=3");
  await inspect(page, `third-page-${testInfo.project.name}`);
  await page.getByLabel("Keyword", { exact: true }).fill("Zzz");
  await page
    .getByRole("button", { name: "Search questions", exact: true })
    .click();
  await expect(page).toHaveURL("/questions?q=Zzz");
  await expect(page.getByText("Showing 1–3 of 3 questions")).toBeVisible();
  await page.reload();
  await expect(page.getByText("0 matching questions")).toBeVisible();
});
test("same-session question and answer publication, rejection, parent hiding and reset", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const title = "A session-only fictional project question";
  const answer =
    "A fictional team could include a written sample schedule and a service checklist.";
  await page.goto("/questions/ask");
  await page.getByLabel("Question title", { exact: true }).fill(title);
  await page.getByLabel("Relevant category").selectOption("healthy-designers");
  await page
    .getByLabel("Question text", { exact: true })
    .fill("What might a fictional team include in a sample project handover?");
  await page.getByRole("button", { name: "Submit question" }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting review" }),
  ).toBeVisible();
  await admin(page);
  await page.getByLabel("Publication status").selectOption("pending");
  await page.getByRole("button", { name: "Filter Q&A", exact: true }).click();
  await expect(
    page.getByText("1 matching questions", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: `Review ${title}`, exact: true })
    .click();
  await page
    .getByLabel("Internal moderation note (optional)")
    .fill("INTERNAL_BROWSER_NOTE");
  await inspect(page, `question-review-${testInfo.project.name}`);
  await page
    .getByRole("button", { name: "Publish question", exact: true })
    .press("Enter");
  await expect(
    page.getByText("Question published. This decision affects only this tab."),
  ).toBeFocused();
  await page
    .getByRole("link", { name: "View public session question" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const detailUrl = page.url();
  await expect(page.locator("main")).not.toContainText("INTERNAL_BROWSER_NOTE");
  await page
    .getByRole("link", { name: /Back to questions/ })
    .first()
    .click();
  await expect(page.getByText("Showing 1–6 of 11 questions")).toBeVisible();
  await member(page);
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.getByRole("button", { name: "Submit answer" }).press("Enter");
  await expect(page.getByLabel("Answer text", { exact: true })).toBeFocused();
  await page.getByLabel("Answer text", { exact: true }).fill(answer);
  await inspect(page, `member-answer-${testInfo.project.name}`);
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(
    page.getByText(
      "Answer submitted as pending in this tab. It is not public and no message was sent.",
    ),
  ).toBeFocused();
  await expect(page.getByLabel("Your submitted answers")).toContainText(
    "Answer status: pending",
  );
  await admin(page);
  await page
    .getByRole("link", { name: "Answers (1 pending)", exact: true })
    .click();
  await page.getByLabel("Publication status").selectOption("pending");
  await page.getByRole("button", { name: "Filter Q&A", exact: true }).click();
  await page
    .getByRole("link", {
      name: "Review answer by Meadow Studio",
      exact: true,
    })
    .click();
  await page
    .getByRole("link", { name: "View public session question" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Published answers (0)" }),
  ).toBeVisible();
  await page.goBack();
  await page
    .getByLabel("Internal moderation note (optional)")
    .fill("ANSWER_BROWSER_NOTE");
  await page
    .getByRole("button", { name: "Publish answer", exact: true })
    .click();
  await inspect(page, `answer-review-${testInfo.project.name}`);
  await page
    .getByRole("link", { name: "View public session question" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Published answers (1)" }),
  ).toBeVisible();
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("ANSWER_BROWSER_NOTE");
  await inspect(page, `public-answer-${testInfo.project.name}`);
  await page.goBack();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Reject answer", exact: true })
    .click();
  await expect(
    page.getByText("Answer: published", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reject answer", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View public session question" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Published answers (0)" }),
  ).toBeVisible();
  await member(page);
  await expect(page.getByLabel("Your submitted answers")).toContainText(
    "Answer status: rejected",
  );
  await admin(page);
  await page
    .getByRole("link", { name: "Answers (0 pending)", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: "Review answer by Meadow Studio",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Publish answer", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Questions (0 pending)", exact: true })
    .click();
  await page
    .getByRole("link", { name: `Review ${title}`, exact: true })
    .click();
  await page
    .getByRole("link", { name: "View public session question" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Published answers/ }),
  ).toBeVisible();
  await page.goBack();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reject question", exact: true })
    .click();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Question unavailable" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(answer);
  await page
    .getByRole("link", { name: "Back to questions", exact: true })
    .click();
  await expect(page.getByText("Showing 1–6 of 10 questions")).toBeVisible();
  await member(page);
  await expect(page.getByLabel("Your submitted answers")).toContainText(
    "Answer status: published",
  );
  await expect(page.getByLabel("Your submitted answers")).toContainText(
    "Question currently unavailable",
  );
  await resetSession(page);
  await expect(page).toHaveURL(/\/demo\/member$/);
  await section(page, "Member", "Q&A");
  await expect(
    page.getByText("No answers submitted for this member yet."),
  ).toBeVisible();
  await page.goto(detailUrl);
  await expect(
    page.getByRole("heading", { name: "Question unavailable" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("member drafts remain isolated across questions, member selection and navigation; refresh and reset clear them", async ({
  page,
}) => {
  test.setTimeout(90000);
  async function openQuestionInbox() {
    await section(page, "Member", "Profile");
    await page
      .getByRole("checkbox", { name: /Mold Testing \/ Inspectors/ })
      .check();
    await page.getByRole("checkbox", { name: /Healthy Home Trades/ }).check();
    await page.getByRole("button", { name: "Update local preview" }).click();
    await section(page, "Member", "Q&A");
    const back = page.getByRole("link", { name: /Back to member questions/ });
    if (await back.isVisible()) await back.click();
    await page
      .getByRole("button", { name: "Clear Q&A filters", exact: true })
      .click();
  }
  await visitWorkspace(page, "/demo/member?section=profile");
  await openQuestionInbox();
  await page
    .locator('.qa-list a[href*="question=planning-inspection"]')
    .click();
  await page
    .getByLabel("Answer text", { exact: true })
    .fill("Draft for the first fictional question.");
  await page.getByRole("link", { name: /Back to member questions/ }).click();
  await page.getByLabel("Q&A keyword").fill("trade");
  await page.getByLabel("Q&A category").selectOption("healthy-trades");
  await page
    .getByRole("button", { name: "Filter Q&A", exact: true })
    .press("Enter");
  await expect(
    page.getByText("1 matching published questions", { exact: true }),
  ).toBeVisible();
  await page.locator('.qa-list a[href*="question=trade-visit"]').click();
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Answer text", { exact: true })
    .fill("Draft for the second fictional question.");
  await switchMember(page, "member-example-pending");
  await expect(
    page.getByText(
      "Answering requires approval, an active subscription and no suspension.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveCount(0);
  await switchMember(page, "member-example-approved");
  await section(page, "Member", "Q&A");
  await page.getByRole("link", { name: /Back to member questions/ }).click();
  await page.locator('.qa-list a[href*="question=trade-visit"]').click();
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: /Back to member questions/ }).click();
  await page.getByLabel("Q&A keyword").fill("trade");
  await page.getByRole("button", { name: "Filter Q&A", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear Q&A filters", exact: true })
    .click();
  await expect(page.getByLabel("Q&A keyword")).toHaveValue("");
  await page
    .locator('.qa-list a[href*="question=planning-inspection"]')
    .click();
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Answer text", { exact: true })
    .fill("A fresh draft after explicit account switching.");
  await resetSession(page, false);
  await expect(page.getByLabel("Answer text", { exact: true })).not.toHaveValue(
    "",
  );
  await resetSession(page);
  await expect(page).toHaveURL(/\/demo\/member$/);
  await openQuestionInbox();
  await page
    .locator('.qa-list a[href*="question=planning-inspection"]')
    .click();
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Answer text", { exact: true })
    .fill("Refresh clears this fictional draft.");
  await page.reload();
  await signIn(page);
  await openQuestionInbox();
  await page
    .locator('.qa-list a[href*="question=planning-inspection"]')
    .click();
  await expect(page.getByLabel("Answer text", { exact: true })).toHaveValue("");
});

test("session routes have neutral HTML and no-script state; seed moderation resets on refresh", async ({
  page,
  request,
  browser,
}) => {
  const response = await request.get("/questions/demo-session-question-1");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("Loading question…");
  expect(html).toContain("Community question | Restored Healthy Homes");
  expect(html).not.toMatch(/QA_PRIVATE|QA_UNPUBLISHED|QA_HIDDEN/);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto("/questions/demo-session-question-1");
  await expect(
    noJs.getByRole("heading", { name: "Community question", exact: true }),
  ).toBeVisible();
  await expect(
    noJs.getByText(/JavaScript is required for session-created questions/),
  ).toBeVisible();
  await noJs.goto("/demo/member?section=qa&question=planning-inspection");
  await expect(noJs.getByRole("button", { name: "Submit answer" })).toHaveCount(
    0,
  );
  await expect(
    noJs.getByRole("heading", { name: "Checking session" }),
  ).toBeVisible();
  await noJs.goto("/demo/admin?section=qa&question=planning-inspection");
  await expect(
    noJs.getByRole("button", { name: "Reject question" }),
  ).toHaveCount(0);
  await context.close();
  await visitWorkspace(
    page,
    "/demo/admin?section=qa&question=planning-inspection",
  );
  await expect(
    page.getByRole("button", { name: "Reject question" }),
  ).toBeEnabled();
  await page
    .getByRole("link", { name: "View public session question" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Published answers/ }),
  ).toBeVisible();
  await page.goBack();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reject question" }).click();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Question unavailable" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Published answers (2)" }),
  ).toBeVisible();
});
