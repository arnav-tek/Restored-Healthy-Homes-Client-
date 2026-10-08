import "server-only";
import type { ProfessionalRecord } from "../../domain/professional";
const samples = [
  {
    businessName: "Fern & Field Inspections",
    serviceArea: "Asheville and nearby communities",
    publicContact: {
      email: "hello@fern-field.example.invalid",
      website: "https://fern-field.example.invalid",
    },
    id: "demo-mold-inspection",
    categoryIds: ["mold-inspection"],
    city: "Asheville",
    state: "NC",
    specialty: "Moisture investigations & mold testing",
    summary:
      "A careful look at moisture concerns, with clear reporting to help you plan your next step.",
    services: [
      "Residential moisture assessments",
      "Mold sampling and reporting",
      "Pre-renovation investigations",
    ],
  },
  {
    businessName: "Cedar Path Remediation",
    serviceArea: "Austin area",
    id: "demo-mold-remediation",
    categoryIds: ["mold-remediation"],
    city: "Austin",
    state: "TX",
    specialty: "Residential mold remediation",
    summary:
      "A considered approach to containment, removal and restoring the spaces you use every day.",
    services: [
      "Containment planning",
      "Residential remediation",
      "Coordination with independent inspectors",
    ],
  },
  {
    businessName: "Kindred Home Renovations",
    id: "demo-healthy-renovations",
    categoryIds: ["healthy-renovations"],
    city: "Portland",
    state: "OR",
    specialty: "Thoughtful materials & home renovations",
    summary:
      "Renovation planning that brings material selection and moisture management into the conversation early.",
    services: [
      "Kitchen and bathroom renovations",
      "Material selection",
      "Moisture-conscious detailing",
    ],
  },
  {
    businessName: "Hearthside Building Co.",
    id: "demo-healthy-builders",
    categoryIds: ["healthy-builders"],
    city: "Boulder",
    state: "CO",
    specialty: "Healthy new homes & building science",
    summary:
      "Custom home planning with attention to ventilation, durable assemblies and everyday comfort.",
    services: [
      "Custom home construction",
      "Ventilation coordination",
      "Building-envelope planning",
    ],
  },
  {
    businessName: "Willow Home Trades",
    id: "demo-healthy-trades",
    categoryIds: ["healthy-trades"],
    city: "Raleigh",
    state: "NC",
    specialty: "Ventilation & interior finishes",
    summary:
      "Practical improvements to the systems and finishes that shape your indoor environment.",
    services: [
      "Ventilation improvements",
      "Low-emission finish selection",
      "Home maintenance planning",
    ],
  },
  {
    businessName: "Softwood Design Studio",
    id: "demo-healthy-designers",
    categoryIds: ["healthy-designers"],
    city: "Madison",
    state: "WI",
    specialty: "Material-conscious interior design",
    summary:
      "Comfortable interiors shaped by natural materials, thoughtful sourcing and the way you live.",
    services: [
      "Interior material consultations",
      "Finish and furnishing selection",
      "Renovation design planning",
    ],
  },
  {
    businessName: "Whole Leaf Health Practice",
    id: "demo-health-practitioners",
    categoryIds: ["health-practitioners"],
    city: "Richmond",
    state: "VA",
    specialty: "Nutrition & environmental health support",
    summary:
      "A multidisciplinary practice bringing nutrition and environmental health into personal care conversations.",
    services: [
      "Nutrition consultations",
      "Care coordination",
      "Environmental health discussions",
    ],
  },
  {
    businessName: "Scout & Spruce Detection",
    id: "demo-mold-detection-dogs",
    categoryIds: ["mold-detection-dogs"],
    city: "Tampa",
    state: "FL",
    specialty: "Canine mold detection",
    summary:
      "A handler-and-dog team supporting investigations alongside inspection professionals.",
    services: [
      "Residential canine detection",
      "Inspection-team coordination",
      "Written search observations",
    ],
  },
];
const active: ProfessionalRecord[] = samples.map((sample, index) => ({
  ...sample,
  credentials: [
    {
      name: "Training record",
      verification: index % 2 === 0 ? "verified" : "unverified",
    },
  ],
  approval: "approved",
  subscription: "active",
  suspended: false,
  featuredEntitlement: "none",
  account: {
    ownerId: `synthetic-owner-${index}`,
    email: `member-${index}@example.invalid`,
  },
  application: {
    internalNotes:
      "Synthetic application review notes; never project into public records.",
  },
  billing: {
    customerId: `synthetic-customer-${index}`,
    subscriptionId: `synthetic-subscription-${index}`,
  },
}));
const excluded: ProfessionalRecord[] = [
  {
    ...active[0],
    id: "demo-pending",
    categoryIds: ["mold-inspection"],
    businessName: "Pending Example Practice",
    approval: "pending",
  },
  {
    ...active[1],
    id: "demo-rejected",
    categoryIds: ["mold-remediation"],
    businessName: "Rejected Example Practice",
    approval: "rejected",
  },
  {
    ...active[2],
    id: "demo-suspended",
    categoryIds: ["healthy-renovations"],
    businessName: "Suspended Example Practice",
    suspended: true,
    featuredEntitlement: "active",
  },
  {
    ...active[3],
    id: "demo-inactive",
    categoryIds: ["healthy-builders"],
    businessName: "Inactive Example Practice",
    subscription: "inactive",
  },
  {
    ...active[4],
    id: "demo-past-due",
    categoryIds: ["healthy-trades"],
    businessName: "Past Due Example Practice",
    subscription: "past_due",
  },
  {
    ...active[5],
    id: "demo-canceled",
    categoryIds: ["healthy-designers"],
    businessName: "Canceled Example Practice",
    subscription: "canceled",
  },
  {
    ...active[6],
    id: "demo-trialing",
    categoryIds: ["health-practitioners"],
    businessName: "Trialing Example Practice",
    subscription: "trialing",
  },
  {
    ...active[7],
    id: "demo-unpaid",
    categoryIds: ["mold-detection-dogs"],
    businessName: "Unpaid Example Practice",
    subscription: "unpaid",
  },
];
export const demoProfessionals: readonly ProfessionalRecord[] = [
  ...active,
  ...excluded,
];
