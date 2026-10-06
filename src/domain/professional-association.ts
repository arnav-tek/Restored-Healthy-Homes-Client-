// Explicit demo ownership only. Unrelated sample studios intentionally remain unlinked.
export interface ProfessionalAssociation {
  readonly memberId: string;
  readonly professionalId: string;
}
export const demoProfessionalAssociations: readonly ProfessionalAssociation[] =
  [
    { memberId: "member-example-fern", professionalId: "demo-mold-inspection" },
    {
      memberId: "member-example-cedar",
      professionalId: "demo-mold-remediation",
    },
  ];
export function professionalForMember(memberId: string): string | null {
  return (
    demoProfessionalAssociations.find((link) => link.memberId === memberId)
      ?.professionalId ?? null
  );
}
