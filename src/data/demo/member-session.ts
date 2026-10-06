// Safe to bundle: only purpose-built fictional workspace DTOs.
// Never import server account, billing or moderation fixtures here.
import type {
  DemoMemberRecord,
  DemoSessionSeed,
  MemberProfileFields,
} from "../../domain/demo-member";
import {
  copyMemberFields,
  reconcileCredentials,
} from "../../domain/demo-member";

const sampleProfile: MemberProfileFields = {
  name: "Sample Member",
  businessName: "Meadow Sample Studio",
  email: "member@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  categoryIds: ["healthy-designers"],
  services: ["Sample material consultations", "Sample interior planning"],
  description:
    "A fictional studio demonstrating thoughtful materials and comfortable interior spaces.",
  practices:
    "This sample business considers ventilation, durable materials and moisture-aware design.",
  listedCredentials: ["Sample course attendance — fictional"],
};
const examples: readonly DemoMemberRecord[] = [
  {
    id: "member-example-approved",
    exampleLabel: "Approved example",
    approval: "approved",
    subscription: "active",
    suspended: false,
    featuredEntitlement: "none",
    credentials: reconcileCredentials(
      [],
      sampleProfile.listedCredentials,
      "approved",
    ),
    decisionReason:
      "Fictional application meets the sample review requirements.",
    suspensionReason: "",
    profile: copyMemberFields(sampleProfile),
  },
  {
    id: "member-example-pending",
    exampleLabel: "Pending example",
    approval: "pending",
    subscription: "inactive",
    suspended: false,
    featuredEntitlement: "none",
    credentials: reconcileCredentials(
      [],
      sampleProfile.listedCredentials,
      "pending",
    ),
    decisionReason: "",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      businessName: "Pending Sample Studio",
    }),
  },
  {
    id: "member-example-rejected",
    exampleLabel: "Rejected example",
    approval: "rejected",
    subscription: "inactive",
    suspended: false,
    featuredEntitlement: "none",
    credentials: reconcileCredentials(
      [],
      sampleProfile.listedCredentials,
      "rejected",
    ),
    decisionReason: "Fictional application needs clearer service information.",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      businessName: "Rejected Sample Studio",
    }),
  },
  {
    id: "member-example-inactive",
    exampleLabel: "Approved, inactive example",
    approval: "approved",
    subscription: "inactive",
    suspended: false,
    featuredEntitlement: "none",
    credentials: reconcileCredentials(
      [],
      sampleProfile.listedCredentials,
      "inactive",
    ),
    decisionReason: "Fictional review approved; subscription remains inactive.",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      businessName: "Inactive Sample Studio",
    }),
  },
  {
    id: "member-example-coordinator",
    exampleLabel: "Alternative coordination example",
    approval: "approved",
    subscription: "active",
    suspended: false,
    featuredEntitlement: "none",
    credentials: [],
    decisionReason:
      "Fictional eligible alternative for consultation reassignment.",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      name: "Sample Coordinator",
      businessName: "Willow Sample Studio",
      email: "coordinator@example.invalid",
      listedCredentials: [],
    }),
  },
  {
    id: "member-example-fern",
    exampleLabel: "Fern & Field review walkthrough",
    approval: "approved",
    subscription: "active",
    suspended: false,
    featuredEntitlement: "none",
    credentials: [],
    decisionReason: "",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      name: "Sample Fern Professional",
      businessName: "Fern & Field Inspections",
      email: "fern@example.invalid",
      city: "Asheville",
      state: "NC",
      categoryIds: ["mold-inspection"],
      services: ["Sample moisture assessments"],
      description: "Fictional inspection business for the review walkthrough.",
      practices: "Sample moisture-aware investigation planning.",
      listedCredentials: [],
    }),
  },
  {
    id: "member-example-cedar",
    exampleLabel: "Cedar Path review walkthrough",
    approval: "approved",
    subscription: "active",
    suspended: false,
    featuredEntitlement: "none",
    credentials: [],
    decisionReason: "",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      name: "Sample Cedar Professional",
      businessName: "Cedar Path Remediation",
      email: "cedar@example.invalid",
      city: "Austin",
      state: "TX",
      categoryIds: ["mold-remediation"],
      services: ["Sample containment planning"],
      description: "Fictional remediation business for the review walkthrough.",
      practices: "Sample containment and coordination planning.",
      listedCredentials: [],
    }),
  },
];
export function getDemoSessionSeed(): DemoSessionSeed {
  // Purpose-built synthetic client DTOs, never account/billing/moderation records.
  return structuredClone({
    records: examples,
    inquiries: [
      {
        id: "inbox-example-1",
        memberId: "member-example-approved",
        sender: "neighbor@example.invalid",
        subject: "Fictional material consultation",
        message:
          "A sample homeowner would like to explore material choices for a fictional renovation. No reply is expected.",
      },
      {
        id: "inbox-example-2",
        memberId: "member-example-approved",
        sender: "homeowner@example.invalid",
        subject: "Fictional planning question",
        message:
          "This separately seeded example asks about the scope of a sample interior planning service. Nothing was delivered from the public inquiry form.",
      },
    ],
  });
}
