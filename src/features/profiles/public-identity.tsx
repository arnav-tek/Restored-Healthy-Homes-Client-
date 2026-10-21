"use client";
import { useDemoSession } from "@/features/member/demo-session";
import { demoProfessionalAssociations } from "@/domain/professional-association";
import { isPubliclyEligible } from "@/domain/listing";
import { projectDemoPublic } from "@/domain/demo-member";

export function PublicIdentity({ professionalId }: { professionalId: string }) {
  const { state } = useDemoSession();
  const memberId = demoProfessionalAssociations.find(
    (item) => item.professionalId === professionalId,
  )?.memberId;
  const record = state.records.find((item) => item.id === memberId);
  if (!record || !isPubliclyEligible(record)) return null;
  const profile = projectDemoPublic(record);
  return (
    <>
      {profile.publicDisplayName && (
        <p className="profile-public-identity">
          Professional / owner: {profile.publicDisplayName}
        </p>
      )}
      {profile.publicEmail && (
        <p className="profile-public-identity">
          Professional / owner email: {profile.publicEmail}
        </p>
      )}
    </>
  );
}
