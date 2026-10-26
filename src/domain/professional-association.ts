// Explicit demo ownership only. Unrelated sample studios intentionally remain unlinked.
export interface ProfessionalAssociation {
  readonly memberId: string;
  readonly professionalId: string;
}
export const PUBLIC_APPLICATION_ID = "demo-local-application";
export const demoProfessionalAssociations: readonly ProfessionalAssociation[] =
  [
    { memberId: "member-example-builder", professionalId: "demo-healthy-builders" },
    { memberId: "member-example-fern", professionalId: "demo-mold-inspection" },
    {
      memberId: "member-example-cedar",
      professionalId: "demo-mold-remediation",
    },
  ];
export function professionalForMember(memberId: string, applicationId: string | null = null): string | null {
  if (memberId === PUBLIC_APPLICATION_ID && applicationId === memberId) return memberId;
  return (
    demoProfessionalAssociations.find((link) => link.memberId === memberId)
      ?.professionalId ?? null
  );
}
export function memberForProfessional(professionalId: string, applicationId: string | null = null): string | null {
  if (professionalId === PUBLIC_APPLICATION_ID && applicationId === professionalId) return professionalId;
  return demoProfessionalAssociations.find((link) => link.professionalId === professionalId)?.memberId ?? null;
}
