import type { Category } from "../domain/categories";
import type { MemberProfileFields } from "../domain/demo-member";

export const applicationLimits = {
  name: 80,
  businessName: 120,
  email: 254,
  phone: 40,
  website: 200,
  city: 80,
  state: 2,
  services: 1500,
  description: 2000,
  practices: 1500,
  listedCredentials: 1200,
} as const;
export type ApplicationField = keyof MemberProfileFields;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;
export const applicationFieldOrder: readonly ApplicationField[] = [
  "name",
  "businessName",
  "email",
  "phone",
  "website",
  "city",
  "state",
  "categoryIds",
  "services",
  "description",
  "practices",
  "listedCredentials",
];
export type ApplicationResult =
  | { ok: true; profile: MemberProfileFields }
  | { ok: false; errors: ApplicationErrors };

export function parseApplication(
  raw: Record<string, unknown>,
  catalog: readonly Pick<Category, "id">[],
): ApplicationResult {
  const errors: ApplicationErrors = {};
  function text(
    field: keyof typeof applicationLimits,
    optional = false,
    minimum = 1,
  ): string {
    const value = raw[field];
    if (typeof value !== "string") {
      errors[field] = "Enter a text value.";
      return "";
    }
    const cleaned = value.trim();
    if (value.length > applicationLimits[field])
      errors[field] = `Use ${applicationLimits[field]} characters or fewer.`;
    else if (!cleaned && optional) return "";
    else if (cleaned.length < minimum)
      errors[field] =
        `Enter at least ${minimum} character${minimum === 1 ? "" : "s"}.`;
    return cleaned;
  }
  const name = text("name"),
    businessName = text("businessName"),
    email = text("email");
  const phone = text("phone", true),
    website = text("website", true);
  const city = text("city"),
    state = text("state").toUpperCase();
  const description = text("description", false, 20),
    practices = text("practices", false, 20);
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid sample email address.";
  if (
    phone &&
    !errors.phone &&
    (!/^[+\d().\s-]{7,40}$/.test(phone) ||
      phone.replace(/\D/g, "").length < 7 ||
      phone.replace(/\D/g, "").length > 15)
  )
    errors.phone = "Use 7–15 digits with optional spaces or phone punctuation.";
  if (state && !errors.state && !/^[A-Z]{2}$/.test(state))
    errors.state = "Use a two-letter state abbreviation, such as NC.";
  if (website && !errors.website) {
    try {
      const url = new URL(website);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        !url.hostname.includes(".")
      )
        throw new Error("invalid");
    } catch {
      errors.website =
        "Use a complete http:// or https:// sample website without login details.";
    }
  }
  const categories = raw.categoryIds;
  const categoryIds =
    Array.isArray(categories) &&
    categories.every((id): id is string => typeof id === "string")
      ? categories
      : [];
  if (
    !categoryIds.length ||
    categoryIds.length > catalog.length ||
    new Set(categoryIds).size !== categoryIds.length ||
    categoryIds.some((id) => !catalog.some((item) => item.id === id))
  )
    errors.categoryIds =
      "Select at least one available category, once per category.";
  function lines(
    field: "services" | "listedCredentials",
    optional: boolean,
    max: number,
  ): string[] {
    const value = text(field, optional);
    const entries = value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (
      !errors[field] &&
      (entries.length > max || entries.some((entry) => entry.length > 120))
    )
      errors[field] =
        `Use up to ${max} lines, with 120 characters or fewer per line.`;
    return entries;
  }
  const services = lines("services", false, 12),
    listedCredentials = lines("listedCredentials", true, 10);
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    profile: {
      name,
      businessName,
      email,
      phone,
      website,
      city,
      state,
      categoryIds: [...categoryIds],
      services,
      description,
      practices,
      listedCredentials,
    },
  };
}
