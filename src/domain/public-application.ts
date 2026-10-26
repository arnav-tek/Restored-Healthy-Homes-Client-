import type { DemoSession } from "./demo-member";
import type { PublicProfile, PublicProfessional } from "./professional";
import { isPubliclyEligible } from "./listing";
import type { Category } from "./categories";
import { projectAcceptedProfile, publicCard } from "./public-session";
import { memberForProfessional, PUBLIC_APPLICATION_ID } from "./professional-association";
export { PUBLIC_APPLICATION_ID } from "./professional-association";

// A reserved demo route, never an account identifier or authorization token.
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
  return [
    ...catalog, ...state.addedCategories.filter((item) => !catalog.some((base) => base.id === item.id)),
  ].map((category) => ({
      ...category,
      name: state.categoryNames[category.id] ?? category.name,
    }));
}

// Only the accepted application enters this compatibility selector. Unsaved
// drafts, private contact identity and moderation/scenario notes never do.
export function publicApplicationProfile(
  state: Pick<DemoSession, "applicationId" | "records">,
): PublicApplicationProfile | null {
  if (state.applicationId !== PUBLIC_APPLICATION_ID) return null;
  const record = state.records.find((item) => item.id === state.applicationId);
  if (!record || !isPubliclyEligible(record)) return null;
  return { ...projectAcceptedProfile(record, PUBLIC_APPLICATION_ID), practices: record.profile.practices };
}

export function withPublicApplication(
  professionals: readonly PublicProfessional[],
  state: Pick<DemoSession, "applicationId" | "records">,
): PublicProfessional[] {
  const cards = professionals.flatMap((initial) => {
    const member = state.records.find((record) => record.id === memberForProfessional(initial.id, state.applicationId));
    if (member && !isPubliclyEligible(member)) return [];
    return [publicCard(member ? { ...projectAcceptedProfile(member, initial.id), specialty: initial.specialty } : initial)];
  });
  const application = publicApplicationProfile(state);
  const entries = new Map(cards.map((card) => [card.id, card]));
  if (application) entries.set(application.id, publicCard(application));
  return [...entries.values()];
}
