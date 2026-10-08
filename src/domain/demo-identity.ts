export type DemoIdentity =
  | { readonly kind: "admin"; readonly accountId: string }
  | {
      readonly kind: "member";
      readonly accountId: string;
      readonly memberId: string;
    };
export interface DemoAccount {
  readonly id: string;
  readonly label: string;
  readonly email: string;
  readonly description: string;
  readonly identity: DemoIdentity;
}
export const demoPasscode = "home-access";
const accounts: readonly DemoAccount[] = [
  {
    id: "admin",
    label: "Administrator",
    email: "admin@example.invalid",
    description: "Review applications, Q&A and consultation assignments.",
    identity: { kind: "admin", accountId: "admin" },
  },
  ...[
    ["approved", "Meadow Studio", "Approved · active subscription"],
    ["pending", "Pending Studio", "Pending · inactive subscription"],
    ["rejected", "Rejected Studio", "Rejected · inactive subscription"],
    ["inactive", "Inactive Studio", "Approved · inactive subscription"],
    [
      "coordinator",
      "Willow Studio",
      "Approved · active subscription; consultation coordination",
    ],
  ].map(([id, label, description]): DemoAccount => ({
    id,
    label,
    description,
    email: `${id}@example.invalid`,
    identity: {
      kind: "member",
      accountId: id,
      memberId: `member-example-${id}`,
    },
  })),
  {
    id: "fern",
    label: "Fern & Field Inspections",
    email: "fern@example.invalid",
    description: "Professional profile · reviews",
    identity: {
      kind: "member",
      accountId: "fern",
      memberId: "member-example-fern",
    },
  },
  {
    id: "cedar",
    label: "Cedar Path Remediation",
    email: "cedar@example.invalid",
    description: "Professional profile · no reviews yet",
    identity: {
      kind: "member",
      accountId: "cedar",
      memberId: "member-example-cedar",
    },
  },
];
export function demoAccounts(
  applicationId: string | null,
): readonly DemoAccount[] {
  return applicationId === "demo-local-application"
    ? [
        ...accounts,
        {
          id: "application",
          label: "Your submitted application",
          email: "application@example.invalid",
          description:
            "Open your prepared application.",
          identity: {
            kind: "member",
            accountId: "application",
            memberId: "demo-local-application",
          },
        },
      ]
    : accounts;
}
export function demoDashboard(identity: DemoIdentity): string {
  return `/demo/${identity.kind}`;
}
