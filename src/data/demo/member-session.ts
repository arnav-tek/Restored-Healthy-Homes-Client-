// Safe to bundle: only purpose-built fictional workspace DTOs.
// Never import server account, billing or moderation fixtures here.
import { demoAdminArticles } from "./admin-articles";
import { demoCertificationEntries } from "./certifications";
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
  name: "Member",
  businessName: "Meadow Studio",
  email: "member@example.invalid",
  phone: "",
  website: "",
  city: "Raleigh",
  state: "NC",
  categoryIds: ["healthy-designers"],
  services: ["Material consultations", "Interior planning"],
  description:
    "A studio demonstrating thoughtful materials and comfortable interior spaces.",
  practices:
    "This business considers ventilation, durable materials and moisture-aware design.",
  listedCredentials: ["Course attendance"],
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
    decisionReason: "Application meets the review requirements.",
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
      businessName: "Pending Studio",
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
    decisionReason: "Application needs clearer service information.",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      businessName: "Rejected Studio",
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
    decisionReason: "Review approved; subscription remains inactive.",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      businessName: "Inactive Studio",
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
    decisionReason: "Eligible alternative for consultation reassignment.",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      name: "Coordinator",
      businessName: "Willow Studio",
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
    featuredEntitlement: "active",
    credentials: [],
    decisionReason: "",
    suspensionReason: "",
    profile: copyMemberFields({
      ...sampleProfile,
      name: "Fern Professional",
      businessName: "Fern & Field Inspections",
      email: "fern@example.invalid",
      city: "Asheville",
      state: "NC",
      categoryIds: ["mold-inspection"],
      services: ["Moisture assessments"],
      description: "Moisture inspections and investigation planning.",
      practices: "Moisture-aware investigation planning.",
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
      name: "Cedar Professional",
      businessName: "Cedar Path Remediation",
      email: "cedar@example.invalid",
      city: "Austin",
      state: "TX",
      categoryIds: ["mold-remediation"],
      services: ["Containment planning"],
      description: "Remediation planning and coordination.",
      practices: "Containment and coordination planning.",
      listedCredentials: [],
    }),
  },
];
export function getDemoSessionSeed(): DemoSessionSeed {
  // Purpose-built synthetic client DTOs, never account/billing/moderation records.
  return structuredClone({
    articles: demoAdminArticles,
    certifications: demoCertificationEntries,
    records: [
      ...examples,
      {
        ...examples[0],
        id: "member-example-builder",
        credentials: [],
        exampleLabel: "Participating builder",
        profile: {
          ...examples[0].profile,
          businessName: "Hearthside Building Co.",
          email: "builder@example.invalid",
          city: "Boulder",
          state: "CO",
          categoryIds: ["healthy-builders"],
        },
      },
    ].map((record, index) => ({
      ...record,
      submittedOn: `2026-10-${String(index + 1).padStart(2, "0")}`,
      freeConsultation: [
        "member-example-approved",
        "member-example-coordinator",
        "member-example-fern",
        "member-example-builder",
      ].includes(record.id),
    })),
    inquiries: [
      {
        id: "inbox-example-1",
        memberId: "member-example-approved",
        sender: "neighbor@example.invalid",
        subject: "Material consultation",
        message: "I would like to explore material choices for a renovation.",
      },
      {
        id: "inbox-example-2",
        memberId: "member-example-approved",
        sender: "homeowner@example.invalid",
        subject: "Planning question",
        message: "What is included in your interior planning service?",
      },
    ],
  });
}
