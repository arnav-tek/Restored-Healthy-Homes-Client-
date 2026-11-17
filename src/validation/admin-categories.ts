import type {
  AdminCategories,
  CategoryMutation,
} from "../domain/admin-categories";
import { parseCategoryName, parseReviewReason } from "./admin";
import { parseNewCategory } from "./admin-editors";
import { isRecord } from "./member-account";
import { inquiryUuid } from "./connected-inquiry";
export const categoryIdPattern = /^[a-z][a-z0-9-]{1,79}$/;
export const billingKeyPattern = /^[a-z][a-z0-9_-]{1,79}$/;
export function parseCategoryMutation(raw: unknown): CategoryMutation | null {
  if (
    !isRecord(raw) ||
    typeof raw.id !== "string" ||
    !categoryIdPattern.test(raw.id) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1 ||
    Number(raw.version) > 999999999
  )
    return null;
  const name = parseCategoryName(raw.name, raw.id, [{ id: raw.id, name: "" }]),
    reason = parseReviewReason(raw.reason);
  if (!name || !reason) return null;
  if (
    raw.action === "rename" &&
    Object.keys(raw).sort().join(",") === "action,id,name,reason,version"
  )
    return {
      action: "rename",
      id: raw.id,
      name,
      reason,
      version: Number(raw.version),
    };
  if (
    raw.action !== "create" ||
    Object.keys(raw).sort().join(",") !==
      "action,billingKey,description,id,monthlyUsd,name,reason,version" ||
    typeof raw.billingKey !== "string" ||
    !billingKeyPattern.test(raw.billingKey)
  )
    return null;
  const created = parseNewCategory(raw, []);
  if (!created) return null;
  return {
    action: "create",
    id: raw.id,
    ...created,
    reason,
    version: Number(raw.version),
    billingKey: raw.billingKey,
  };
}
export function parseAdminCategories(raw: unknown): AdminCategories | null {
  if (
    !isRecord(raw) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1 ||
    !Array.isArray(raw.items) ||
    raw.items.length > 32 ||
    !Array.isArray(raw.history) ||
    raw.history.length > 20
  )
    return null;
  const items: AdminCategories["items"] = [],
    history: AdminCategories["history"] = [];
  for (const c of raw.items) {
    if (
      !isRecord(c) ||
      typeof c.id !== "string" ||
      !categoryIdPattern.test(c.id) ||
      typeof c.name !== "string" ||
      !parseCategoryName(c.name, c.id, [{ id: c.id, name: "" }]) ||
      typeof c.description !== "string" ||
      c.description.length > 300 ||
      !Number.isSafeInteger(c.monthlyUsd) ||
      Number(c.monthlyUsd) < 1 ||
      Number(c.monthlyUsd) > 10000 ||
      typeof c.billingKey !== "string" ||
      !billingKeyPattern.test(c.billingKey) ||
      typeof c.active !== "boolean"
    )
      return null;
    items.push({
      id: c.id,
      name: c.name,
      description: c.description,
      monthlyUsd: Number(c.monthlyUsd),
      billingKey: c.billingKey,
      active: c.active,
    });
  }
  if (new Set(items.map((c) => c.id)).size !== items.length) return null;
  for (const h of raw.history) {
    if (
      !isRecord(h) ||
      typeof h.id !== "string" ||
      !inquiryUuid.test(h.id) ||
      typeof h.categoryId !== "string" ||
      !categoryIdPattern.test(h.categoryId) ||
      typeof h.actorId !== "string" ||
      !inquiryUuid.test(h.actorId) ||
      (h.action !== "create" && h.action !== "rename") ||
      typeof h.name !== "string" ||
      h.name.length > 80 ||
      (h.previousName !== null && typeof h.previousName !== "string") ||
      !parseReviewReason(h.reason) ||
      !Number.isSafeInteger(h.version) ||
      Number(h.version) < 2 ||
      typeof h.at !== "string" ||
      !Number.isFinite(Date.parse(h.at))
    )
      return null;
    history.push({
      id: h.id,
      categoryId: h.categoryId,
      actorId: h.actorId,
      action: h.action,
      name: h.name,
      previousName: h.previousName as string | null,
      reason: String(h.reason),
      version: Number(h.version),
      at: h.at,
    });
  }
  return { version: Number(raw.version), items, history };
}
