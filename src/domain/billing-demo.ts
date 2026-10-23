import type { DemoSession } from "./demo-member";
import type { SubscriptionStatus } from "./professional";
import { sessionCategories } from "./session-catalog";

export type BillingDemoKind = "checkout" | "renewal" | "recovery" | "cancel";
export interface BillingDemoAttempt {
  readonly memberId: string;
  readonly attemptId: number;
  readonly categoryId: string;
  readonly monthlyUsd: number;
  readonly billingKey: string;
  readonly previousSubscription: SubscriptionStatus;
  readonly kind: BillingDemoKind;
  readonly stage:
    | "checkout"
    | "recovery"
    | "failed"
    | "active"
    | "cancel-confirmation"
    | "canceled";
}
export type BillingDemoAction =
  | {
      type: "billing-start";
      id: string;
      categoryId: string;
      kind: BillingDemoKind;
    }
  | {
      type: "billing-result";
      id: string;
      attemptId: number;
      outcome: "success" | "failure";
    }
  | { type: "billing-cancel"; id: string; attemptId: number }
  | { type: "billing-close"; id: string };

export function canStartBilling(
  kind: BillingDemoKind,
  status: SubscriptionStatus,
): boolean {
  switch (kind) {
    case "checkout":
      return ["inactive", "canceled", "trialing"].includes(status);
    case "renewal":
      return status === "active";
    case "recovery":
      return status === "past_due" || status === "unpaid";
    case "cancel":
      return ["active", "past_due", "unpaid", "trialing"].includes(status);
    default:
      return false;
  }
}

// No gateway, account tokens, card details, timers or persistence. A demo member
// can operate only on its own record; this is a showcase guard, never real auth.
export function reduceBillingDemo(
  state: DemoSession,
  action: BillingDemoAction,
): DemoSession {
  if (
    state.identity?.kind !== "member" ||
    state.identity.memberId !== action.id
  )
    return state;
  const record = state.records.find(({ id }) => id === action.id);
  if (!record) return state;
  const revision = state.revision + 1;
  const withoutAttempt = state.billing.filter(
    ({ memberId }) => memberId !== record.id,
  );
  const current = state.billing.find(({ memberId }) => memberId === record.id);
  if (action.type === "billing-close") {
    return current
      ? {
          ...state,
          billing: withoutAttempt,
          revision,
          notice:
            "Billing demonstration closed. Membership status is unchanged.",
        }
      : state;
  }
  if (action.type === "billing-start") {
    const category = sessionCategories(state).find(
      ({ id }) =>
        id === action.categoryId && record.profile.categoryIds.includes(id),
    );
    if (!category || !canStartBilling(action.kind, record.subscription))
      return state;
    // A pending review must be completed or explicitly abandoned before another.
    if (
      current &&
      ["checkout", "recovery", "cancel-confirmation"].includes(current.stage)
    )
      return state;
    const attempt: BillingDemoAttempt = {
      memberId: record.id,
      attemptId: revision,
      categoryId: category.id,
      monthlyUsd: category.monthlyUsd,
      billingKey: category.billingKey,
      previousSubscription: record.subscription,
      kind: action.kind,
      stage:
        action.kind === "cancel"
          ? "cancel-confirmation"
          : action.kind === "recovery"
            ? "recovery"
            : "checkout",
    };
    return {
      ...state,
      revision,
      billing: [...withoutAttempt, attempt],
      notice: "Review this simulated scenario. Nothing has been charged.",
    };
  }
  if (
    !current ||
    current.attemptId !== action.attemptId ||
    current.previousSubscription !== record.subscription
  )
    return state;
  const category = sessionCategories(state).find(
    ({ id }) => id === current.categoryId,
  );
  if (
    !category ||
    !record.profile.categoryIds.includes(category.id) ||
    category.monthlyUsd !== current.monthlyUsd ||
    category.billingKey !== current.billingKey
  )
    return state;
  let subscription: SubscriptionStatus;
  let stage: BillingDemoAttempt["stage"];
  if (action.type === "billing-cancel") {
    if (current.stage !== "cancel-confirmation" || current.kind !== "cancel")
      return state;
    subscription = "canceled";
    stage = "canceled";
  } else {
    if (
      !["checkout", "recovery"].includes(current.stage) ||
      !["success", "failure"].includes(action.outcome)
    )
      return state;
    subscription = action.outcome === "success" ? "active" : "past_due";
    stage = action.outcome === "success" ? "active" : "failed";
  }
  return {
    ...state,
    revision,
    records: state.records.map((item) =>
      item.id === record.id ? { ...item, subscription } : item,
    ),
    billing: [...withoutAttempt, { ...current, stage }],
    notice:
      stage === "active"
        ? "Simulated payment succeeded. Membership is active in this tab; no money was collected."
        : stage === "failed"
          ? "Simulated payment failed. Membership is past due in this tab; no payment was attempted."
          : "Simulated cancellation completed immediately in this tab. No real subscription or refund exists.",
  };
}
