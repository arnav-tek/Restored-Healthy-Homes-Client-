import type { AdminArticle } from "../../domain/admin-showcase";

// Client-safe fictional editorial material; no private server content imports.
export const demoAdminArticles: readonly AdminArticle[] = [
  {
    id: "demo-article-project-notes",
    title: "Getting your project notes ready",
    category: "planning",
    summary: "A sample resource to demonstrate the owner's editorial workflow.",
    body: "Write down the questions you want to discuss with a specialist.\n\nThis sample article demonstrates drafting and previewing a resource. Final editorial content needs client approval.",
    status: "draft",
  },
];
