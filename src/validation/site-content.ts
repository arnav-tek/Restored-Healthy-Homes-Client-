import {
  contentFields,
  contentKinds,
  type ContentKind,
  type ContentFields,
  type PublishedContent,
  type ContentDocument,
  type ContentWorkspace,
} from "../domain/site-content";
import { resourceCategories } from "../domain/resource";
import { parseCertification } from "./admin-editors";
import { inquiryUuid } from "./connected-inquiry";
import { parseReviewReason } from "./admin";
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length &&
  keys.every((k) => Object.hasOwn(v, k));
export const isContentKind = (v: unknown): v is ContentKind =>
  contentKinds.some((k) => k === v);
export const contentKey = (v: unknown) =>
  typeof v === "string" &&
  v.length <= 100 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
export function safeProviderUrl(value: string) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return (
      /^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::443)?(?:[/?#][^\s\\]*)?$/i.test(
        value,
      ) &&
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.hostname.includes(".")
    );
  } catch {
    return false;
  }
}
export function parseContentFields(
  kind: ContentKind,
  raw: unknown,
  publishing = false,
): ContentFields | null {
  if (!record(raw) || !exact(raw, Object.keys(contentFields[kind])))
    return null;
  const result: ContentFields = {};
  for (const [key, [, max]] of Object.entries(contentFields[kind])) {
    const value = raw[key];
    if (
      typeof value !== "string" ||
      value.length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    )
      return null;
    result[key] = value.trim();
  }
  if (
    kind === "resource" &&
    result.category &&
    !resourceCategories.some((c) => c.id === result.category)
  )
    return null;
  if (kind === "pathway") {
    if (!safeProviderUrl(result.providerUrl)) return null;
    if (publishing && !parseCertification(result)) return null;
  }
  if (kind === "about") {
    for (const [key, ext] of [
      ["videoSrc", "mp4|webm"],
      ["posterSrc", "jpg|jpeg|png|webp"],
      ["captionsSrc", "vtt"],
    ]) {
      if (
        result[key] &&
        !new RegExp(`^/media/client/[a-zA-Z0-9_-]+\\.(${ext})$`).test(
          result[key],
        )
      )
        return null;
    }
    if (
      publishing &&
      (!result.story ||
        !result.why ||
        (!!result.videoSrc && (!result.captionsSrc || !result.transcript)))
    )
      return null;
  }
  if (
    kind === "contact" &&
    ((result.email &&
      !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(
        result.email,
      )) ||
      (result.phone && !/^\+?[0-9() .-]{7,40}$/.test(result.phone)))
  )
    return null;
  if (
    publishing &&
    kind !== "pathway" &&
    (!result.title || !result.summary || (kind !== "about" && !result.body))
  )
    return null;
  if (
    publishing &&
    kind === "resource" &&
    (!result.category ||
      result.title.length < 3 ||
      result.summary.length < 20 ||
      result.body.length < 40)
  )
    return null;
  return result;
}
export function parseContentMutation(raw: unknown) {
  if (
    !record(raw) ||
    !isContentKind(raw.kind) ||
    !parseReviewReason(raw.reason)
  )
    return null;
  const kind = raw.kind,
    reason = String(raw.reason).trim();
  if (raw.action === "create") {
    if (
      !exact(raw, ["action", "kind", "key", "fields", "reason"]) ||
      !contentKey(raw.key)
    )
      return null;
    if (kind !== "resource" && kind !== "pathway" && raw.key !== kind)
      return null;
    const fields = parseContentFields(kind, raw.fields);
    return fields
      ? {
          action: "create" as const,
          kind,
          key: String(raw.key),
          fields,
          reason,
        }
      : null;
  }
  if (
    !["save", "publish", "unpublish"].includes(String(raw.action)) ||
    !inquiryUuid.test(String(raw.id)) ||
    !Number.isSafeInteger(raw.version) ||
    Number(raw.version) < 1
  )
    return null;
  const base = {
    id: String(raw.id),
    kind,
    version: Number(raw.version),
    reason,
  };
  if (raw.action === "save") {
    if (!exact(raw, ["action", "id", "kind", "version", "fields", "reason"]))
      return null;
    const fields = parseContentFields(kind, raw.fields);
    return fields ? { ...base, action: "save" as const, fields } : null;
  }
  if (raw.action === "publish")
    return exact(raw, [
      "action",
      "id",
      "kind",
      "version",
      "approved",
      "reason",
    ]) && raw.approved === true
      ? { ...base, action: "publish" as const, approved: true as const }
      : null;
  return exact(raw, ["action", "id", "kind", "version", "reason"])
    ? { ...base, action: "unpublish" as const }
    : null;
}
export function projectPublishedContent(raw: unknown): PublishedContent | null {
  if (!record(raw) || !isContentKind(raw.kind) || !contentKey(raw.key))
    return null;
  const fields = parseContentFields(raw.kind, raw.fields, true);
  return fields ? { kind: raw.kind, key: String(raw.key), fields } : null;
}
export function projectContentWorkspace(raw: unknown): ContentWorkspace | null {
  if (
    !record(raw) ||
    !Array.isArray(raw.items) ||
    !Array.isArray(raw.history) ||
    !Number.isSafeInteger(raw.page) ||
    !Number.isSafeInteger(raw.total)
  )
    return null;
  const items: ContentDocument[] = [];
  for (const value of raw.items) {
    if (
      !record(value) ||
      !inquiryUuid.test(String(value.id)) ||
      !isContentKind(value.kind) ||
      !contentKey(value.key) ||
      !Number.isSafeInteger(value.version) ||
      Number(value.version) < 1
    )
      return null;
    const fields = parseContentFields(value.kind, value.fields),
      published =
        value.published === null
          ? null
          : projectPublishedContent(value.published);
    if (
      !fields ||
      (value.published !== null && !published) ||
      (value.publishedVersion !== null &&
        !Number.isSafeInteger(value.publishedVersion))
    )
      return null;
    items.push({
      id: String(value.id),
      kind: value.kind,
      key: String(value.key),
      fields,
      published,
      publishedVersion:
        value.publishedVersion === null ? null : Number(value.publishedVersion),
      version: Number(value.version),
    });
  }
  const history = [];
  for (const h of raw.history) {
    if (
      !record(h) ||
      !inquiryUuid.test(String(h.id)) ||
      typeof h.action !== "string" ||
      typeof h.at !== "string" ||
      typeof h.reason !== "string" ||
      !Number.isSafeInteger(h.version)
    )
      return null;
    history.push({
      id: String(h.id),
      action: h.action,
      at: h.at,
      reason: h.reason,
      version: Number(h.version),
    });
  }
  return { items, history, page: Number(raw.page), total: Number(raw.total) };
}

export function contentQuery(
  q: URLSearchParams,
): Record<string, unknown> | null {
  if (
    [...q.keys()].some(
      (k) => !["record", "page"].includes(k) || q.getAll(k).length !== 1,
    ) ||
    (q.has("record") && !inquiryUuid.test(String(q.get("record")))) ||
    (q.has("page") && !/^[1-9][0-9]{0,5}$/.test(q.get("page") ?? ""))
  )
    return null;
  return {
    action: "get",
    page: Number(q.get("page") ?? 1),
    ...(q.has("record") ? { id: q.get("record") } : {}),
  };
}
