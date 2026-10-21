import { categories } from "../domain/categories";
import type { QaQuery, QuestionFields } from "../domain/qa";
import type { RawSearchParams } from "./directory";

export const questionLimits = { title: 160, body: 2000 } as const;
export const questionFieldOrder = ["title", "categoryId", "body"] as const;
export type QuestionField = (typeof questionFieldOrder)[number];
export type QuestionErrors = Partial<Record<QuestionField, string>>;
export type QaQueryErrors = Partial<Record<keyof QaQuery, string>>;

export function parseQuestion(
  input: Record<QuestionField, unknown>,
  catalog: readonly { id: string }[] = categories,
):
  | { ok: true; question: QuestionFields }
  | { ok: false; errors: QuestionErrors } {
  const errors: QuestionErrors = {};
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const categoryId =
    typeof input.categoryId === "string" ? input.categoryId : "";
  if (title.length < 10 || title.length > questionLimits.title)
    errors.title = "Use a title of 10–160 characters.";
  if (!catalog.some((category) => category.id === categoryId))
    errors.categoryId = "Choose one relevant category.";
  if (body.length < 20 || body.length > questionLimits.body)
    errors.body = "Use 20–2,000 characters for your question.";
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, question: { title, categoryId, body } };
}

export function parseQaQuery(
  params: RawSearchParams,
  catalog: readonly { id: string }[] = categories,
): {
  query: QaQuery;
  errors: QaQueryErrors;
} {
  const errors: QaQueryErrors = {};
  const read = (key: keyof QaQuery, max: number) => {
    const value = params[key];
    if (Array.isArray(value) || (value !== undefined && value.length > max)) {
      errors[key] = `Use one value, up to ${max} characters.`;
      return "";
    }
    return (value ?? "").trim().replace(/\s+/g, " ");
  };
  const q = read("q", 120);
  const category = read("category", 80);
  if (category && !catalog.some((item) => item.id === category))
    errors.category = "Choose one of the eight available categories.";
  const rawPage = read("page", 5);
  let page = 1;
  if (rawPage) {
    if (/^[1-9]\d*$/.test(rawPage) && Number(rawPage) <= 10000)
      page = Number(rawPage);
    else errors.page = "Page must be a whole number from 1 to 10000.";
  }
  return {
    query: { q, category: errors.category ? "" : category, page },
    errors,
  };
}

export function qaHref(query: QaQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.page > 1) params.set("page", String(query.page));
  return `/questions${params.size ? `?${params}` : ""}`;
}
export function safeQaReturn(
  value: string | string[] | undefined,
  catalog: readonly { id: string }[] = categories,
): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !/^\/questions(?:\?|$)/.test(value) ||
    /[\\#]/.test(value) ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return "/questions";
  const params = new URLSearchParams(value.slice("/questions".length));
  const raw: RawSearchParams = {};
  // Only known keys are copied; extra parameters never survive canonicalization.
  for (const key of ["q", "category", "page"]) {
    const values = params.getAll(key);
    if (values.length) raw[key] = values.length === 1 ? values[0] : values;
  }
  const { query, errors } = parseQaQuery(raw, catalog);
  return Object.keys(errors).length ? "/questions" : qaHref(query);
}
export function questionHref(
  id: string,
  returnTo: string,
  catalog: readonly { id: string }[] = categories,
): string {
  return `/questions/${encodeURIComponent(id)}?${new URLSearchParams({ returnTo: safeQaReturn(returnTo, catalog) })}`;
}
