import { applicationFieldOrder, parseApplication } from "./application";
import type { Category } from "../domain/categories";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseMemberMutation(
  raw: unknown,
  catalog: readonly (Pick<Category, "id"> & { active?: boolean })[],
  editing: boolean,
) {
  if (
    !isRecord(raw) ||
    Object.keys(raw).some((key) => !["profile", "version"].includes(key)) ||
    !isRecord(raw.profile) ||
    Object.keys(raw.profile).some(
      (key) => !(applicationFieldOrder as readonly string[]).includes(key),
    )
  ) {
    return {
      ok: false as const,
      error: "Only permitted profile fields can be submitted.",
    };
  }
  if (
    editing &&
    (!Number.isSafeInteger(raw.version) || Number(raw.version) < 1)
  )
    return {
      ok: false as const,
      error: "Reload the saved profile before editing.",
    };
  if (!editing && raw.version !== undefined)
    return {
      ok: false as const,
      error: "A new application cannot include a saved version.",
    };
  const p = raw.profile;
  if (
    ![p.services, p.listedCredentials].every(
      (value) =>
        Array.isArray(value) &&
        value.every((item) => typeof item === "string" && !/[\r\n]/.test(item)),
    )
  )
    return {
      ok: false as const,
      error: "Enter services and credentials as separate lines.",
    };
  const services = p.services as string[];
  if (new Set(services.map((value) => value.trim())).size !== services.length)
    return { ok: false as const, error: "List each service once." };
  const parsed = parseApplication(
    {
      ...p,
      services: services.join("\n"),
      listedCredentials: (p.listedCredentials as string[]).join("\n"),
    },
    catalog.filter((category) => category.active !== false),
  );
  if (!parsed.ok)
    return { ...parsed, error: "Check the profile fields and try again." };
  return { ...parsed, version: editing ? Number(raw.version) : undefined };
}
