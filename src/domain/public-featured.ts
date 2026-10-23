import type { DemoSession } from "./demo-member";
import type { PublicProfessional } from "./professional";
import { isPubliclyEligible } from "./listing";
import {
  demoProfessionalAssociations,
  professionalForMember,
} from "./professional-association";
import {
  PUBLIC_APPLICATION_ID,
  withPublicApplication,
} from "./public-application";

export function hasPublicFeaturedLink(memberId: string): boolean {
  return (
    memberId === PUBLIC_APPLICATION_ID ||
    professionalForMember(memberId) !== null
  );
}

// Stable public catalog order, followed by the accepted application. This is
// showcase placement only: no purchased priority, ranking score or search sort.
export function publicFeaturedExamples(
  professionals: readonly PublicProfessional[],
  initialFeaturedIds: readonly string[],
  state: Pick<DemoSession, "records" | "applicationId">,
): PublicProfessional[] {
  return withPublicApplication(professionals, state).filter((professional) => {
    const memberId =
      professional.id === PUBLIC_APPLICATION_ID
        ? state.applicationId
        : demoProfessionalAssociations.find(
            (link) => link.professionalId === professional.id,
          )?.memberId;
    if (!memberId) return initialFeaturedIds.includes(professional.id);
    const record = state.records.find((item) => item.id === memberId);
    return (
      !!record &&
      isPubliclyEligible(record) &&
      record.featuredEntitlement === "active"
    );
  });
}
