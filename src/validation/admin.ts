import type { Category } from "../domain/categories";

export const reviewReasonLimit = 300;
export function parseReviewReason(value: unknown): string | null {
  return typeof value === "string" &&
    value.trim().length >= 3 &&
    value.length <= reviewReasonLimit
    ? value.trim()
    : null;
}
export function parseCategoryName(
  value: unknown,
  id: string,
  catalog: readonly Pick<Category, "id" | "name">[],
): string | null {
  if (
    typeof value !== "string" ||
    value.length > 80 ||
    !catalog.some((item) => item.id === id)
  )
    return null;
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  const comparable = (text: string) =>
    text
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .replace(/[^\p{L}\p{N}]/gu, "");
  if (
    name.length < 3 ||
    name.length > 80 ||
    !comparable(name) ||
    /[\p{Cc}\p{Cf}<>]/u.test(name)
  )
    return null;
  return catalog.some(
    (item) => item.id !== id && comparable(item.name) === comparable(name),
  )
    ? null
    : name;
}
