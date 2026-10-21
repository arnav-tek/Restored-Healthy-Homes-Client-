import type { Category } from "../domain/categories";
import { parseCategoryName } from "./admin";
import {
  certificationKinds,
  type CertificationFields,
} from "../domain/editorial";

export function parseNewCategory(
  raw: Record<string, unknown>,
  catalog: readonly Pick<Category, "id" | "name">[],
) {
  const name = parseCategoryName(raw.name, "new-category", [
    ...catalog,
    { id: "new-category", name: "" },
  ]);
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const monthlyUsd = typeof raw.monthlyUsd === "number" ? raw.monthlyUsd : NaN;
  if (
    !name ||
    description.length < 20 ||
    description.length > 300 ||
    !Number.isInteger(monthlyUsd) ||
    monthlyUsd < 1 ||
    monthlyUsd > 10000 ||
    catalog.length >= 32
  )
    return null;
  return { name, description, monthlyUsd };
}

export const certificationLimits = {
  introduction: 500,
  providerName: 160,
  providerUrl: 400,
  description: 1500,
  requirements: 1500,
  steps: 2000,
  timeline: 500,
  costs: 700,
} as const;
export function parseCertification(
  raw: Record<string, unknown>,
): CertificationFields | null {
  const text = (field: keyof typeof certificationLimits, minimum = 3) => {
    const value = raw[field];
    return typeof value === "string" &&
      value.length <= certificationLimits[field] &&
      value.trim().length >= minimum
      ? value.trim()
      : null;
  };
  const introduction = text("introduction", 20),
    providerName = text("providerName"),
    providerUrl = text("providerUrl");
  const description = text("description", 20),
    requirements = text("requirements", 10),
    stepsText = text("steps", 10);
  const timeline = text("timeline"),
    costs = text("costs");
  const kind = certificationKinds.find((item) => item === raw.kind);
  if (
    !introduction ||
    !providerName ||
    !providerUrl ||
    !description ||
    !requirements ||
    !stepsText ||
    !timeline ||
    !costs ||
    !kind
  )
    return null;
  try {
    const url = new URL(providerUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname.includes(".")
    )
      return null;
  } catch {
    return null;
  }
  const steps = stepsText
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);
  if (
    !steps.length ||
    steps.length > 8 ||
    steps.some((step) => step.length > 300)
  )
    return null;
  return {
    introduction,
    providerName,
    kind,
    providerUrl,
    description,
    requirements,
    steps,
    timeline,
    costs,
  };
}
