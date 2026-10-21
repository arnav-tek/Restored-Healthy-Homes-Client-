import { resourceCategories } from "../domain/resource";
import type { AdminArticle } from "../domain/admin-showcase";

export function parseAdminArticle(
  raw: Record<string, unknown>,
): Omit<AdminArticle, "id" | "status"> | null {
  const text = (key: string, min: number, max: number) => {
    const value = raw[key];
    return typeof value === "string" &&
      value.trim().length >= min &&
      value.length <= max
      ? value.trim()
      : null;
  };
  const title = text("title", 3, 120);
  const summary = text("summary", 20, 350);
  const body = text("body", 40, 10000);
  const category = resourceCategories.find(
    (item) => item.id === raw.category,
  )?.id;
  return title && summary && body && category
    ? { title, summary, body, category }
    : null;
}
