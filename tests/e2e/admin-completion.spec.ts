import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visitWorkspace, signIn } from "./helpers/demo-sign-in";
import { section, review, resetSession } from "./helpers/dashboard";
import { mainNav } from "./helpers/application";

test.setTimeout(120000);
async function inspect(page: Page, file: string) {
  await expect(page).toHaveTitle(/\S/);
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
    path: `output/playwright/admin-completion-${file}.png`,
    fullPage: true,
  });
}

test("category creation, stable rename and profile associations reach application and question forms", async ({
  page,
}, info) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  await visitWorkspace(page, "/demo/admin?section=categories");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await expect(page.getByLabel("New category name")).toBeFocused();
  await page.getByLabel("New category name").fill("Indoor Air Planning");
  await page
    .getByLabel("Category description", { exact: true })
    .fill("A sample specialty for planning healthier indoor spaces.");
  await page.getByLabel("Preview monthly price (USD)").fill("123");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await page
    .getByLabel("Category to rename")
    .selectOption({ label: "Indoor Air Planning" });
  await expect(
    page.getByLabel("Category to rename").locator("option:checked"),
  ).toHaveText("Indoor Air Planning");
  const id = await page.getByLabel("Category to rename").inputValue();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Air Quality Planning");
  await page.getByRole("button", { name: "Rename category" }).click();
  await expect(page.getByLabel("Category to rename")).toHaveValue(id);
  await expect(page.locator(".category-edit-panel")).toContainText("$123");
  await inspect(page, `categories-${info.project.name}`);
  await section(page, "Admin", "Listings");
  await review(page, "Meadow Studio");
  await page.getByText("Edit business profile", { exact: true }).click();
  await page.getByRole("checkbox", { name: /Air Quality Planning/ }).check();
  await page.getByRole("button", { name: "Save profile changes" }).click();
  await expect(page.getByTestId("session-directory")).toContainText(
    "Meadow Studio",
  );
  await mainNav(page, "List Your Business");
  await expect(
    page.getByRole("checkbox", { name: /Air Quality Planning.*123/ }),
  ).toBeVisible();
  await mainNav(page, "Ask a Specialist");
  await page.getByRole("link", { name: "Ask a question", exact: true }).click();
  await page.getByLabel("Relevant category").selectOption(id);
  await page
    .getByLabel("Question title", { exact: true })
    .fill("Preparing an indoor air planning conversation");
  await page
    .getByLabel("Question text", { exact: true })
    .fill(
      "What project notes should a homeowner prepare for an indoor air planning conversation?",
    );
  await page.getByRole("button", { name: "Submit question" }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting review", exact: true }),
  ).toBeVisible();
  await signIn(page, "admin");
  await section(page, "Admin", "Q&A");
  await expect(page.getByRole("main")).toContainText(
    "Preparing an indoor air planning conversation",
  );
  await section(page, "Admin", "Categories");
  await resetSession(page);
  await section(page, "Admin", "Categories");
  await expect(
    page
      .getByLabel("Category to rename")
      .getByRole("option", { name: "Air Quality Planning" }),
  ).toHaveCount(0);
  expect(mutations).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});

test("certification editor saves drafts and publishes only reviewed pathway fields to the public session view", async ({
  page,
}, info) => {
  await visitWorkspace(page, "/demo/admin?section=certifications");
  await page
    .getByLabel("Provider / program name", { exact: true })
    .fill("Sample Learning Program");
  await page
    .getByLabel("Provider URL", { exact: true })
    .fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save certification draft" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "HTTPS",
  );
  await page
    .getByLabel("Provider URL", { exact: true })
    .fill("https://training.example.invalid/pathway");
  await page
    .getByLabel("Entry requirements", { exact: true })
    .fill(
      "Confirm enrollment requirements with the selected provider before applying.",
    );
  await page
    .getByLabel("Typical timeline", { exact: true })
    .fill("Sample timeline to confirm with the provider.");
  await page
    .getByLabel("External program costs", { exact: true })
    .fill("Sample external fees, pending provider confirmation.");
  await page.getByRole("button", { name: "Save certification draft" }).click();
  await mainNav(page, "Certifications");
  await page.locator("#pathway-mold-inspection summary").click();
  await expect(page.locator("#pathway-mold-inspection")).not.toContainText(
    "Sample Learning Program",
  );
  await signIn(page, "admin");
  await section(page, "Admin", "Certifications");
  await expect(
    page.getByLabel("Provider / program name", { exact: true }),
  ).toHaveValue("Sample Learning Program");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish pathway", exact: true })
    .click();
  await expect(page.getByTestId("certification-preview")).toContainText(
    "Sample Learning Program",
  );
  await inspect(page, `certification-editor-${info.project.name}`);
  await page
    .getByRole("link", { name: "View Certifications", exact: true })
    .click();
  const pathway = page.locator("#pathway-mold-inspection");
  if ((await pathway.getAttribute("open")) === null)
    await pathway.locator("summary").click();
  await expect(pathway).toContainText("Sample Learning Program");
  await expect(pathway).toContainText("Confirm enrollment requirements");
  await expect(
    pathway.getByRole("link", { name: "Sample Learning Program" }),
  ).toHaveAttribute("href", "https://training.example.invalid/pathway");
  await inspect(page, `certifications-public-${info.project.name}`);
  await page.reload();
  await expect(page.getByRole("main")).not.toContainText(
    "Sample Learning Program",
  );
});

test("public professional identity is opt-in and never falls back to private application contacts", async ({
  page,
}, info) => {
  await visitWorkspace(page, "/demo/member?section=profile", "fern");
  await page
    .getByLabel("Your name", { exact: true })
    .fill("Private Application Owner");
  await page
    .getByLabel("Contact email", { exact: true })
    .fill("private-owner@example.invalid");
  await page
    .getByLabel("Public professional / owner name (optional)")
    .fill("River Example");
  await page
    .getByLabel("Public email (optional)")
    .fill("public-office@example.invalid");
  await page.getByRole("button", { name: "Update local preview" }).click();
  await page.getByText("Public profile", { exact: true }).click();
  await expect(page.locator(".member-public-preview")).toContainText(
    "River Example",
  );
  await expect(page.locator(".member-public-preview")).not.toContainText(
    "Private Application Owner",
  );
  await mainNav(page, "Find Specialists");
  await page
    .getByRole("link", {
      name: "View profile for Fern & Field Inspections",
      exact: true,
    })
    .click();
  await expect(page.getByRole("main")).toContainText(
    "Professional / owner: River Example",
  );
  await expect(page.getByRole("main")).toContainText(
    "public-office@example.invalid",
  );
  await expect(page.getByRole("main")).not.toContainText(
    "Private Application Owner",
  );
  await expect(page.getByRole("main")).not.toContainText(
    "private-owner@example.invalid",
  );
  const html = await (await page.request.get(page.url())).text();
  expect(html).not.toContain("private-owner@example.invalid");
  expect(html).not.toContain("Private Application Owner");
  await inspect(page, `identity-${info.project.name}`);
  await page.reload();
  await expect(page.getByRole("main")).not.toContainText("River Example");
  await expect(page.getByRole("main")).not.toContainText(
    "public-office@example.invalid",
  );
});

test("resource drafts stay private while published resources browse safely in the current tab", async ({
  page,
}, info) => {
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" || request.postData())
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await visitWorkspace(page, "/demo/admin?section=content");
  await page
    .getByRole("link", { name: "Create resource", exact: true })
    .click();
  await page
    .getByLabel("Resource title")
    .fill("A showcase project planning resource");
  await page
    .getByLabel("Resource summary")
    .fill("A sample resource explaining the session publishing workflow.");
  await page
    .getByLabel("Article body")
    .fill(
      "Keep your project notes together before contacting a specialist.\n\n<script>window.resourceInjected = true</script> remains plain text in this example.",
    );
  await page.getByRole("button", { name: "Save resource draft" }).click();
  await page
    .getByRole("link", { name: "View published resources →", exact: true })
    .click();
  await expect(page.getByRole("main")).not.toContainText(
    "A showcase project planning resource",
  );
  await signIn(page, "admin");
  await section(page, "Admin", "Content");
  const card = page.locator(".admin-management-card").filter({
    has: page.getByRole("heading", {
      name: "A showcase project planning resource",
      exact: true,
    }),
  });
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Publish to showcase" }).click();
  await page
    .getByRole("link", { name: "View published resources →", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "A showcase project planning resource",
      exact: true,
    })
    .getByRole("link")
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A showcase project planning resource",
  );
  await expect(page.getByRole("main")).toContainText(
    "<script>window.resourceInjected = true</script>",
  );
  expect(await page.evaluate(() => "resourceInjected" in window)).toBe(false);
  const html = await (await page.request.get(page.url())).text();
  expect(html).not.toContain("Keep your project notes together");
  await inspect(page, `resource-public-${info.project.name}`);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Resource unavailable", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("remaining admin editors reflow at 320px and enlarged text without page overflow", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Shared narrow-screen check runs once",
  );
  await page.setViewportSize({ width: 320, height: 800 });
  await visitWorkspace(page, "/demo/admin?section=categories");
  // Exercise accepted maximum-length words rather than relying on short sample copy.
  await page.getByLabel("New category name").fill("A".repeat(80));
  await page
    .getByLabel("Category description", { exact: true })
    .fill("A sample specialty for testing long public category names.");
  await page.getByLabel("Preview monthly price (USD)").fill("111");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await inspect(page, "categories-320");
  await section(page, "Admin", "Certifications");
  await page
    .getByLabel("Certification category")
    .selectOption({ label: "A".repeat(80) });
  await expect(
    page.getByLabel("Provider / program name", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Pathway introduction").fill("I".repeat(400));
  await page
    .getByLabel("Provider / program name", { exact: true })
    .fill("P".repeat(160));
  await page
    .getByLabel("Provider URL", { exact: true })
    .fill("https://training.example.invalid/long-pathway");
  await page.getByLabel("Program description").fill("D".repeat(600));
  await page.getByLabel("Entry requirements").fill("R".repeat(500));
  await page.getByLabel("General steps").fill("S".repeat(250));
  await page
    .getByLabel("Typical timeline", { exact: true })
    .fill("T".repeat(400));
  await page
    .getByLabel("External program costs", { exact: true })
    .fill("C".repeat(600));
  await page
    .getByLabel("Program type", { exact: true })
    .selectOption("Training / continuing education");
  await page.getByRole("button", { name: "Save certification draft" }).click();
  await inspect(page, "certification-editor-320");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Publish pathway", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View Certifications", exact: true })
    .click();
  const pathway = page
    .locator(".education-pathway")
    .filter({ hasText: "A".repeat(80) });
  if ((await pathway.getAttribute("open")) === null)
    await pathway.locator("summary").click();
  await inspect(page, "certification-public-320-long-text");
  await signIn(page, "admin");
  await section(page, "Admin", "Listings");
  await review(page, "Meadow Studio");
  await page.getByText("Edit business profile", { exact: true }).click();
  await page
    .getByLabel("Public professional / owner name (optional)")
    .fill("A".repeat(80));
  await page.addStyleTag({
    content:
      "body { font-size: 200% !important; } .search-field input, .search-field textarea, .search-field select, .search-field label { font-size: inherit !important; }",
  });
  await inspect(page, "identity-editor-320-zoom");
});
