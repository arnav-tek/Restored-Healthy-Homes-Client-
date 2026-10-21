import type { DemoMemberRecord } from "./demo-member";
import { isPubliclyEligible } from "./listing";
import type { SubscriptionStatus } from "./professional";
import type { ResourceCategory } from "./resource";

export const membershipStatuses: readonly SubscriptionStatus[] = [
  "active",
  "inactive",
  "past_due",
  "canceled",
  "trialing",
  "unpaid",
];
export interface AdminArticle {
  readonly id: string;
  readonly title: string;
  readonly category: ResourceCategory;
  readonly summary: string;
  readonly body: string;
  readonly status: "draft" | "published";
}
export type PublicSessionArticle = Pick<AdminArticle, "id" | "title" | "category" | "summary" | "body">;
export function publishedSessionArticles(articles: readonly AdminArticle[]): PublicSessionArticle[] {
  return articles.filter((item) => item.status === "published").map(({ id, title, category, summary, body }) => ({ id, title, category, summary, body }));
}
export function isSessionArticleId(id: string): boolean {
  return /^demo-article-(?:[1-9]\d*|project-notes)$/.test(id);
}
export type AdminShowcaseAction =
  | {
      type: "simulate-membership";
      id: string;
      status: SubscriptionStatus;
      reason: string;
    }
  | { type: "set-featured"; id: string; enabled: boolean; reason: string }
  | {
      type: "save-article";
      id: string;
      fields: Omit<AdminArticle, "id" | "status">;
    }
  | { type: "publish-article"; id: string; published: boolean };

export function adminAnalytics(
  records: readonly DemoMemberRecord[],
  month: string,
) {
  const eligible = records.filter(isPubliclyEligible);
  return {
    total: records.length,
    active: records.filter((item) => item.subscription === "active").length,
    eligible: eligible.length,
    newApplications: records.filter((item) =>
      item.submittedOn?.startsWith(`${month}-`),
    ).length,
    undated: records.filter((item) => !item.submittedOn).length,
    membership: membershipStatuses.map((status) => ({
      status,
      count: records.filter((item) => item.subscription === status).length,
    })),
    byCategory: (id: string) => ({
      active: records.filter(
        (item) =>
          item.profile.categoryIds.includes(id) &&
          item.subscription === "active",
      ).length,
      eligible: eligible.filter((item) => item.profile.categoryIds.includes(id))
        .length,
      total: records.filter((item) => item.profile.categoryIds.includes(id))
        .length,
    }),
  };
}

// Featured placement is only a presentation preview. Entitlement cannot bypass eligibility.
export function featuredDemoRecords(records: readonly DemoMemberRecord[]) {
  return records.filter(
    (record) =>
      isPubliclyEligible(record) && record.featuredEntitlement === "active",
  );
}
