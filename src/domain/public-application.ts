import type { DemoSession } from "./demo-member";
import type { PublicProfile, PublicProfessional } from "./professional";
import { isPubliclyEligible } from "./listing";
import type { Category } from "./categories";

// A reserved demo route, never an account identifier or authorization token.
export const PUBLIC_APPLICATION_ID = "demo-local-application";
export function isPublicApplicationId(value: string): boolean {
  return value === PUBLIC_APPLICATION_ID;
}
export function isSessionCategoryId(value: unknown): value is string {
  return (
    typeof value === "string" && /^demo-category-[1-9]\d{0,9}$/.test(value)
  );
}
export interface PublicApplicationProfile extends PublicProfile {
  publicDisplayName?: string;
  practices: string;
}
export function publicDirectoryCatalog(
  catalog: readonly Category[],
  state: Pick<DemoSession, "addedCategories" | "categoryNames">,
): readonly Category[] {
  // Canonical public labels/prices stay unchanged. Added specialties are local.
  return [
    ...catalog,
    ...state.addedCategories.map((category) => ({
      ...category,
      name: state.categoryNames[category.id] ?? category.name,
    })),
  ];
}

// Only the accepted application enters this selector. Unsaved drafts, example
// members, private contact identity and moderation/scenario notes never do.
export function publicApplicationProfile(
  state: Pick<DemoSession, "applicationId" | "records">,
): PublicApplicationProfile | null {
  if (state.applicationId !== PUBLIC_APPLICATION_ID) return null;
  const record = state.records.find((item) => item.id === state.applicationId);
  if (!record || !isPubliclyEligible(record)) return null;
  const fields = record.profile;
  return {
    id: PUBLIC_APPLICATION_ID,
    businessName: fields.businessName,
    categoryIds: [...fields.categoryIds],
    city: fields.city,
    state: fields.state,
    specialty: "",
    summary: fields.description,
    services: [...fields.services],
    verifiedCredentials: record.credentials
      .filter((claim) => claim.verification === "verified")
      .map((claim) => claim.text),
    listedCredentials: record.credentials
      .filter((claim) => claim.verification === "unverified")
      .map((claim) => claim.text),
    serviceArea: "",
    contact: {
      email: fields.publicEmail ?? "",
      phone: fields.phone,
      website: fields.website,
    },
    ...(fields.publicDisplayName
      ? { publicDisplayName: fields.publicDisplayName }
      : {}),
    practices: fields.practices,
    freeConsultation: record.freeConsultation === true,
  };
}

export function withPublicApplication(
  professionals: readonly PublicProfessional[],
  state: Pick<DemoSession, "applicationId" | "records">,
): PublicProfessional[] {
  const profile = publicApplicationProfile(state);
  if (!profile) return [...professionals];
  // A second explicit allowlist keeps full profile contact fields off cards.
  return [
    ...professionals,
    {
      id: profile.id,
      businessName: profile.businessName,
      categoryIds: [...profile.categoryIds],
      city: profile.city,
      state: profile.state,
      specialty: profile.specialty,
      summary: profile.summary,
      services: [...profile.services],
      verifiedCredentials: [...profile.verifiedCredentials],
      freeConsultation: profile.freeConsultation,
    },
  ];
}
