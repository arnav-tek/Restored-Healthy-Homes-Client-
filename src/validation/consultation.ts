import { categories } from "../domain/categories";
import {
  consultationFormats,
  type ConsultationFields,
} from "../domain/consultation";
export const consultationLimits = {
  name: 100,
  email: 254,
  topic: 2000,
} as const;
export const consultationFieldOrder = [
  "name",
  "email",
  "categoryId",
  "format",
  "topic",
] as const;
export type ConsultationField = (typeof consultationFieldOrder)[number];
export type ConsultationErrors = Partial<Record<ConsultationField, string>>;
export type ConsultationResult =
  | { ok: true; fields: ConsultationFields }
  | { ok: false; errors: ConsultationErrors };
export function parseConsultation(
  raw: Record<string, unknown>,
  catalog: readonly { id: string }[] = categories,
): ConsultationResult {
  const errors: ConsultationErrors = {};
  function text(field: keyof typeof consultationLimits, min: number): string {
    const value = raw[field];
    if (typeof value !== "string") {
      errors[field] = "Enter a text value.";
      return "";
    }
    const cleaned = value.trim();
    if (value.length > consultationLimits[field] || cleaned.length < min)
      errors[field] =
        `Use ${min}–${consultationLimits[field].toLocaleString("en-US")} characters.`;
    return cleaned;
  }
  const name = text("name", 2),
    email = text("email", 1),
    topic = text("topic", 20);
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email address.";
  const categoryId =
    typeof raw.categoryId === "string" ? raw.categoryId.trim() : "";
  if (!catalog.some((category) => category.id === categoryId))
    errors.categoryId = "Choose one available professional category.";
  const format = consultationFormats.find(
    (item) => typeof raw.format === "string" && item.id === raw.format.trim(),
  )?.id;
  if (!format) errors.format = "Choose phone or no preference.";
  if (Object.keys(errors).length || !format) return { ok: false, errors };
  return { ok: true, fields: { name, email, categoryId, format, topic } };
}
export const coordinationNoteLimit = 500;
export function parseCoordinationNote(value: unknown): string | null {
  return typeof value === "string" && value.length <= coordinationNoteLimit
    ? value.trim()
    : null;
}
