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
export const demoPasscode = "home-demo";
const accounts: readonly DemoAccount[] = [
  {
    id: "admin",
    label: "Demo administrator",
    email: "admin@example.invalid",
    description: "Review applications, Q&A and consultation assignments.",
    identity: { kind: "admin", accountId: "admin" },
  },
  ...[
    ["approved", "Meadow Sample Studio", "Approved · active subscription"],
    ["pending", "Pending Sample Studio", "Pending · inactive subscription"],
    ["rejected", "Rejected Sample Studio", "Rejected · inactive subscription"],
    ["inactive", "Inactive Sample Studio", "Approved · inactive subscription"],
    [
      "coordinator",
      "Willow Sample Studio",
      "Approved · active subscription; reassignment example",
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
    description: "Fictional public-profile account · review walkthrough",
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
    description: "Fictional public-profile account · initially no reviews",
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
          label: "Your submitted demo application",
          email: "application@example.invalid",
          description:
            "Preview the fictional application created in this tab. No real account was created.",
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
