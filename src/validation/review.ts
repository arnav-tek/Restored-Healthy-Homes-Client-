import {
  isReviewRating,
  reviewPageSize,
  type ReviewFields,
} from "../domain/review";
export const reviewFieldOrder = ["displayName", "rating", "body"] as const;
export type ReviewField = (typeof reviewFieldOrder)[number];
export type ReviewErrors = Partial<Record<ReviewField, string>>;
export const reviewLimits = { displayName: 80, body: 2000 } as const;
export function parseReview(
  input: Record<string, unknown>,
): { ok: true; fields: ReviewFields } | { ok: false; errors: ReviewErrors } {
  const errors: ReviewErrors = {};
  const displayName =
    typeof input.displayName === "string" &&
    input.displayName.length <= reviewLimits.displayName
      ? input.displayName.trim()
      : "";
  const body =
    typeof input.body === "string" && input.body.length <= reviewLimits.body
      ? input.body.trim()
      : "";
  const rating =
    typeof input.rating === "string" && /^[1-5]$/.test(input.rating)
      ? Number(input.rating)
      : input.rating;
  if (displayName.length < 2 || displayName.length > reviewLimits.displayName)
    errors.displayName = "Enter a sample display name using 2–80 characters.";
  if (!isReviewRating(rating))
    errors.rating = "Choose a whole-number rating from 1 to 5.";
  if (body.length < 20 || body.length > reviewLimits.body)
    errors.body = "Write a fictional review using 20–2,000 characters.";
  return !Object.keys(errors).length && isReviewRating(rating)
    ? { ok: true, fields: { displayName, rating, body } }
    : { ok: false, errors };
}
export function parseReviewPage(
  value: unknown,
  count: number,
): { page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(count / reviewPageSize));
  const requested =
    typeof value === "string" && /^[1-9]\d{0,4}$/.test(value)
      ? Number(value)
      : 1;
  return { page: Math.min(requested, pages), pages };
}
