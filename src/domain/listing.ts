import type {
  ProfessionalRecord,
  PublicProfessional,
  PublicProfile,
} from "./professional";
export function isPubliclyEligible(
  record: Pick<ProfessionalRecord, "approval" | "subscription" | "suspended">,
): boolean {
  return (
    record.approval === "approved" &&
    record.subscription === "active" &&
    record.suspended === false
  );
}
export function isFeaturedEligible(record: ProfessionalRecord): boolean {
  return isPubliclyEligible(record) && record.featuredEntitlement === "active";
}
export function toPublicProfessional(
  record: ProfessionalRecord,
): PublicProfessional {
  return {
    id: record.id,
    businessName: record.businessName,
    categoryIds: [...record.categoryIds],
    city: record.city,
    state: record.state,
    specialty: record.specialty,
    summary: record.summary,
    services: [...record.services],
    verifiedCredentials: record.credentials
      .filter((item) => item.verification === "verified")
      .map((item) => item.name),
  };
}
export function listPublicProfessionals(
  records: readonly ProfessionalRecord[],
  categoryId?: string,
): PublicProfessional[] {
  return records
    .filter(isPubliclyEligible)
    .filter((record) => !categoryId || record.categoryIds.includes(categoryId))
    .map(toPublicProfessional);
}
export function findPublicProfile(
  records: readonly ProfessionalRecord[],
  id: string,
): PublicProfile | null {
  const record = records.find(
    (item) => item.id === id && isPubliclyEligible(item),
  );
  if (!record) return null;
  return {
    ...toPublicProfessional(record),
    serviceArea: record.serviceArea ?? "",
    listedCredentials: record.credentials
      .filter((item) => item.verification === "unverified")
      .map((item) => item.name),
    contact: {
      email: record.publicContact?.email ?? "",
      phone: record.publicContact?.phone ?? "",
      website: record.publicContact?.website ?? "",
    },
  };
}
