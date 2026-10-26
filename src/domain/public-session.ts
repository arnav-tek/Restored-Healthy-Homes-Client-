import type { DemoMemberRecord, DemoSession } from "./demo-member";
import type { PublicProfessional, PublicProfile } from "./professional";
import { isPubliclyEligible } from "./listing";
import {
  memberForProfessional,
  PUBLIC_APPLICATION_ID,
} from "./professional-association";

export interface SessionPublicProfile extends PublicProfile {
  publicDisplayName?: string;
  practices?: string;
}
type PublicSession = Pick<
  DemoSession,
  "records" | "applicationId" | "publicProfiles" | "publicProfessionalIds"
>;

// Initialize linked demo records from the same safe public examples. Private
// application identity is retained only in the private workspace record.
export function seedPublicRecords(
  records: readonly DemoMemberRecord[],
  profiles: readonly PublicProfile[],
): DemoMemberRecord[] {
  return records.map((record) => {
    const profile = profiles.find(
      (item) => memberForProfessional(item.id) === record.id,
    );
    if (!profile) return record;
    return {
      ...record,
      credentials: [
        ...profile.verifiedCredentials.map((text, index) => ({
          id: `${record.id}-verified-${index}`,
          text,
          verification: "verified" as const,
        })),
        ...profile.listedCredentials.map((text, index) => ({
          id: `${record.id}-listed-${index}`,
          text,
          verification: "unverified" as const,
        })),
      ],
      profile: {
        ...record.profile,
        businessName: profile.businessName,
        categoryIds: [...profile.categoryIds],
        city: profile.city,
        state: profile.state,
        description: profile.summary,
        services: [...profile.services],
        publicEmail: profile.contact.email,
        phone: profile.contact.phone,
        website: profile.contact.website,
      },
    };
  });
}

export function projectAcceptedProfile(
  record: DemoMemberRecord,
  id: string,
  initial?: PublicProfile,
): SessionPublicProfile {
  const fields = record.profile;
  return {
    id,
    businessName: fields.businessName,
    categoryIds: [...fields.categoryIds],
    city: fields.city,
    state: fields.state,
    specialty: initial?.specialty ?? "",
    summary: fields.description,
    services: [...fields.services],
    verifiedCredentials: record.credentials
      .filter((claim) => claim.verification === "verified")
      .map((claim) => claim.text),
    listedCredentials: record.credentials
      .filter((claim) => claim.verification === "unverified")
      .map((claim) => claim.text),
    freeConsultation: record.freeConsultation === true,
    serviceArea: initial?.serviceArea ?? "",
    contact: {
      email: fields.publicEmail ?? "",
      phone: fields.phone,
      website: fields.website,
    },
    ...(fields.publicDisplayName
      ? { publicDisplayName: fields.publicDisplayName }
      : {}),
    practices: fields.practices,
  };
}

export function publicSessionProfiles(
  state: PublicSession,
): SessionPublicProfile[] {
  const profiles = new Map<string, SessionPublicProfile>();
  for (const initial of state.publicProfiles ?? []) {
    const memberId = memberForProfessional(initial.id, state.applicationId);
    const record = state.records.find((item) => item.id === memberId);
    if (record && !isPubliclyEligible(record)) continue;
    // Explicit projection even for an unlinked typed snapshot.
    const safe: PublicProfile = {
      ...publicCard(initial),
      listedCredentials: [...initial.listedCredentials],
      serviceArea: initial.serviceArea,
      contact: {
        email: initial.contact.email,
        phone: initial.contact.phone,
        website: initial.contact.website,
      },
    };
    profiles.set(
      initial.id,
      record ? projectAcceptedProfile(record, initial.id, safe) : safe,
    );
  }
  const application = state.records.find(
    (record) =>
      record.id === state.applicationId && record.id === PUBLIC_APPLICATION_ID,
  );
  if (application && isPubliclyEligible(application))
    profiles.set(
      application.id,
      projectAcceptedProfile(application, application.id),
    );
  return [...profiles.values()];
}
export function publicCard(profile: PublicProfessional): PublicProfessional {
  return {
    id: profile.id,
    businessName: profile.businessName,
    categoryIds: [...profile.categoryIds],
    city: profile.city,
    state: profile.state,
    specialty: profile.specialty,
    summary: profile.summary,
    services: [...profile.services],
    verifiedCredentials: [...profile.verifiedCredentials],
    freeConsultation: profile.freeConsultation === true,
  };
}
export function publicSessionProfessionals(
  state: PublicSession,
): PublicProfessional[] {
  return publicSessionProfiles(state).map(publicCard);
}
export function eligiblePublicIds(state: PublicSession): string[] {
  if (state.publicProfiles !== null)
    return publicSessionProfiles(state).map(({ id }) => id);
  // Legacy domain callers can supply an ID-only public snapshot; actual pages
  // always receive the explicit public profile DTOs from the server adapter.
  const ids = state.publicProfessionalIds.filter((id) => {
    const member = state.records.find(
      (record) => record.id === memberForProfessional(id, state.applicationId),
    );
    return !member || isPubliclyEligible(member);
  });
  const application = state.records.find(
    (record) =>
      record.id === state.applicationId && record.id === PUBLIC_APPLICATION_ID,
  );
  return [
    ...new Set([
      ...ids,
      ...(application && isPubliclyEligible(application)
        ? [application.id]
        : []),
    ]),
  ];
}
