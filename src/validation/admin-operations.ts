import {
  approvalStates,
  featuredViews,
  reportMembershipStates,
  type FeaturedItem,
  type FeaturedWorkspace,
  type OperationsReport,
} from "../domain/admin-operations";
import { isRecord } from "./member-account";
import { inquiryUuid } from "./connected-inquiry";
import { parseReviewReason } from "./admin";
import { parseAnalyticsMonth } from "./admin-showcase";
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
const count = (n: unknown): n is number =>
  Number.isSafeInteger(n) && Number(n) >= 0;
const page = (n: unknown): n is number => count(n) && n >= 1 && n <= 999999;
const uuid = (v: unknown): v is string =>
  typeof v === "string" && inquiryUuid.test(v);
const text = (v: unknown): v is string => typeof v === "string";
const date = (v: unknown): v is string =>
  text(v) && Number.isFinite(Date.parse(v));
const approval = (v: unknown): v is FeaturedItem["approval"] =>
  approvalStates.some((a) => a === v);
const membership = (v: unknown): v is FeaturedItem["membership"] =>
  v === null || reportMembershipStates.some((s) => s !== "missing" && s === v);
export function parseOperationsInput(raw: unknown) {
  if (!isRecord(raw) || !page(raw.page)) return null;
  if (raw.action === "report")
    return exact(raw, ["action", "page", "month"]) &&
      parseAnalyticsMonth(raw.month)
      ? { action: "report" as const, page: raw.page, month: String(raw.month) }
      : null;
  const view = featuredViews.find((v) => v === raw.view);
  if (!view) return null;
  if (raw.action === "get_featured")
    return exact(raw, ["action", "page", "view"])
      ? { action: "get_featured" as const, page: raw.page, view }
      : null;
  if (
    raw.action !== "set_featured" ||
    !exact(raw, [
      "action",
      "page",
      "view",
      "id",
      "selected",
      "version",
      "reason",
    ]) ||
    !uuid(raw.id) ||
    typeof raw.selected !== "boolean" ||
    !count(raw.version) ||
    raw.version > 999999999
  )
    return null;
  const reason = parseReviewReason(raw.reason);
  return reason
    ? {
        action: "set_featured" as const,
        page: raw.page,
        view,
        id: raw.id,
        selected: raw.selected,
        version: raw.version,
        reason,
      }
    : null;
}
export function operationsQuery(params: URLSearchParams, report = false) {
  if (
    [...params.keys()].some(
      (k) =>
        !(report ? ["month", "page"] : ["view", "page"]).includes(k) ||
        params.getAll(k).length !== 1,
    )
  )
    return null;
  const rawPage = params.get("page") ?? "1";
  if (!/^[1-9][0-9]{0,5}$/.test(rawPage)) return null;
  return parseOperationsInput(
    report
      ? {
          action: "report",
          page: Number(rawPage),
          month: params.get("month") ?? new Date().toISOString().slice(0, 7),
        }
      : {
          action: "get_featured",
          page: Number(rawPage),
          view: params.get("view") ?? "selected",
        },
  );
}
export function projectFeatured(raw: unknown): FeaturedWorkspace | null {
  if (
    !isRecord(raw) ||
    raw.kind !== "featured" ||
    !page(raw.page) ||
    !count(raw.total) ||
    !Array.isArray(raw.items) ||
    raw.items.length > 20 ||
    !Array.isArray(raw.history) ||
    raw.history.length > 20
  )
    return null;
  const view = featuredViews.find((v) => v === raw.view);
  if (!view) return null;
  const items: FeaturedItem[] = [];
  for (const p of raw.items) {
    if (
      !isRecord(p) ||
      !uuid(p.id) ||
      !text(p.businessName) ||
      !approval(p.approval) ||
      !membership(p.membership) ||
      typeof p.suspended !== "boolean" ||
      !["active", "none"].includes(String(p.entitlement)) ||
      typeof p.selected !== "boolean" ||
      !count(p.version) ||
      typeof p.eligible !== "boolean" ||
      typeof p.visible !== "boolean"
    )
      return null;
    items.push({
      id: p.id,
      businessName: p.businessName,
      approval: p.approval,
      membership: p.membership,
      suspended: p.suspended,
      entitlement: p.entitlement === "active" ? "active" : "none",
      selected: p.selected,
      version: p.version,
      eligible: p.eligible,
      visible: p.visible,
    });
  }
  const history = [];
  for (const h of raw.history) {
    if (
      !isRecord(h) ||
      !uuid(h.id) ||
      !uuid(h.professionalId) ||
      !uuid(h.actorId) ||
      typeof h.selected !== "boolean" ||
      !count(h.version) ||
      h.version < 1 ||
      !text(h.reason) ||
      !date(h.at)
    )
      return null;
    history.push({
      id: h.id,
      professionalId: h.professionalId,
      actorId: h.actorId,
      selected: h.selected,
      version: h.version,
      reason: h.reason,
      at: h.at,
    });
  }
  return {
    kind: "featured",
    page: raw.page,
    view,
    total: raw.total,
    items,
    history,
  };
}
function counts<K extends string>(
  raw: unknown,
  keys: readonly K[],
): Record<K, number> | null {
  if (!isRecord(raw) || !keys.every((k) => count(raw[k]))) return null;
  return Object.fromEntries(keys.map((k) => [k, raw[k]])) as Record<K, number>;
}
export function projectOperationsReport(raw: unknown): OperationsReport | null {
  if (
    !isRecord(raw) ||
    raw.kind !== "report" ||
    !date(raw.asOf) ||
    !parseAnalyticsMonth(raw.month) ||
    !page(raw.page) ||
    !count(raw.total) ||
    !count(raw.eligible) ||
    !count(raw.undated) ||
    !Array.isArray(raw.categories) ||
    raw.categories.length > 32 ||
    !Array.isArray(raw.months) ||
    raw.months.length > 12 ||
    !Array.isArray(raw.items) ||
    raw.items.length > 20
  )
    return null;
  const applicationStatuses = counts(raw.applicationStatuses, approvalStates),
    membershipStates = counts(raw.membershipStates, reportMembershipStates),
    featured = counts(raw.featured, [
      "selected",
      "visibleEditorial",
      "entitled",
      "visibleEntitled",
      "visible",
    ] as const);
  if (!applicationStatuses || !membershipStates || !featured) return null;
  const categories = [];
  for (const c of raw.categories) {
    if (
      !isRecord(c) ||
      !text(c.id) ||
      !text(c.name) ||
      typeof c.active !== "boolean" ||
      !count(c.total) ||
      !count(c.activeMemberships) ||
      !count(c.eligible)
    )
      return null;
    categories.push({
      id: c.id,
      name: c.name,
      active: c.active,
      total: c.total,
      activeMemberships: c.activeMemberships,
      eligible: c.eligible,
    });
  }
  const months = [];
  for (const m of raw.months) {
    if (!isRecord(m) || !parseAnalyticsMonth(m.month) || !count(m.count))
      return null;
    months.push({ month: String(m.month), count: m.count });
  }
  const items = [];
  for (const p of raw.items) {
    if (
      !isRecord(p) ||
      !uuid(p.id) ||
      !text(p.businessName) ||
      !approval(p.approval) ||
      !membership(p.membership) ||
      typeof p.suspended !== "boolean" ||
      (p.submittedAt !== null && !date(p.submittedAt))
    )
      return null;
    items.push({
      id: p.id,
      businessName: p.businessName,
      approval: p.approval,
      membership: p.membership,
      suspended: p.suspended,
      submittedAt: p.submittedAt as string | null,
    });
  }
  return {
    kind: "report",
    asOf: raw.asOf,
    month: String(raw.month),
    page: raw.page,
    total: raw.total,
    eligible: raw.eligible,
    undated: raw.undated,
    applicationStatuses,
    membershipStates,
    featured,
    categories,
    months,
    items,
  };
}
