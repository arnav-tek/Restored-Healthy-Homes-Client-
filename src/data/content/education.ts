import type { Category } from "@/domain/categories";

export interface EducationOption {
  readonly name: string;
  readonly kind:
    | "Professional certification"
    | "Training / continuing education"
    | "Provider training and assessment";
  readonly description: string;
  readonly href: `https://${string}`;
}
export interface EducationPathway {
  readonly requirements?: string;
  readonly introduction: string;
  readonly options: readonly EducationOption[];
  readonly steps: readonly string[];
  readonly timeline: string;
  readonly costs: string;
}

const timeline =
  "To be confirmed with the provider for your chosen program and experience.";
const costs =
  "To be confirmed. Ask the provider about training, assessment and renewal fees before enrolling.";
const steps = [
  "Choose a focus and check local licensing or practice requirements.",
  "Confirm provider eligibility, course content and assessment requirements.",
  "Complete the applicable learning and assessment; describe your actual qualifications accurately when applying to the directory.",
] as const;

// Public editorial references, not required directory qualifications or endorsements.
// Verified official sources: 2026-10-07. Program selection, timelines and costs await approval.
// Keys are immutable catalog IDs; display names and membership prices stay in the catalog.
export const educationPathways: Readonly<
  Record<string, EducationPathway | undefined>
> = {
  "mold-inspection": {
    introduction:
      "Explore microbial investigation and sampling education suited to your inspection work.",
    options: [
      {
        name: "ACAC — microbial investigation certifications",
        kind: "Professional certification",
        description:
          "ACAC’s CMI and CMC pathways assess field experience and examination requirements. Completing a course alone does not confer these credentials.",
        href: "https://www.acac.org/moldinspectioncertification",
      },
    ],
    steps,
    timeline,
    costs,
  },
  "mold-remediation": {
    introduction:
      "Explore learning focused on microbial remediation and the responsibilities of your chosen specialty.",
    options: [
      {
        name: "IICRC — Applied Microbial Remediation Technician",
        kind: "Professional certification",
        description:
          "The AMRT pathway covers mold and sewage remediation. Check current prerequisites and requirements directly with IICRC.",
        href: "https://iicrc.org/amrt/",
      },
    ],
    steps,
    timeline,
    costs,
  },
  "healthy-renovations": {
    introduction:
      "Build knowledge of green building as a complement to your renovation experience.",
    options: [
      {
        name: "USGBC — green building education",
        kind: "Training / continuing education",
        description:
          "Explore USGBC’s education resources. Course selection and any completion certificate are program-specific; these resources do not replace contractor licensing.",
        href: "https://support.usgbc.org/hc/en-us/categories/4407292629523-Education",
      },
    ],
    steps,
    timeline,
    costs,
  },
  "healthy-builders": {
    introduction:
      "Explore green building learning relevant to planning and constructing new homes.",
    options: [
      {
        name: "USGBC — green building education",
        kind: "Training / continuing education",
        description:
          "Explore education resources for green building. Choose learning appropriate to your project role and confirm local building and licensing requirements separately.",
        href: "https://support.usgbc.org/hc/en-us/categories/4407292629523-Education",
      },
    ],
    steps,
    timeline,
    costs,
  },
  "healthy-trades": {
    introduction:
      "Choose education for your particular trade. Home performance is one possible specialty, not a qualification for every trade.",
    options: [
      {
        name: "BPI — Building Analyst Technician",
        kind: "Professional certification",
        description:
          "A diagnostic testing and whole-home energy assessment pathway. BPI lists its Building Science Principles prerequisite and field examination requirements.",
        href: "https://www.bpi.org/resources/certifications/building-analyst-technician/",
      },
    ],
    steps,
    timeline,
    costs:
      "Exam fees are set by individual BPI test centers. Training and total pathway costs: To be confirmed with your selected provider.",
  },
  "healthy-designers": {
    introduction:
      "Explore material health learning to inform thoughtful design and material choices.",
    options: [
      {
        name: "Healthy Materials Lab — material health education",
        kind: "Training / continuing education",
        description:
          "Explore its certificate program and material health courses. A training certificate is distinct from an architecture or other professional license.",
        href: "https://courses.healthymaterialslab.org/collections/certificate-program",
      },
    ],
    steps,
    timeline,
    costs,
  },
  "health-practitioners": {
    introduction:
      "Explore additional education within your existing professional scope. Physicians, nutritionists and naturopaths have different requirements.",
    options: [
      {
        name: "IFM — certification eligibility",
        kind: "Professional certification",
        description:
          "Review IFM’s discipline, degree and license eligibility before considering its functional medicine certification. Additional certification does not expand legal scope of practice.",
        href: "https://www.ifm.org/certification/eligibility",
      },
    ],
    steps,
    timeline,
    costs,
  },
  "mold-detection-dogs": {
    introduction:
      "Explore training for the handler and canine team, including how the provider assesses and maintains that team’s skills.",
    options: [
      {
        name: "Mold Dog / Florida Canine Academy — provider information",
        kind: "Provider training and assessment",
        description:
          "The provider describes mold-detection dog training. Current enrollment, handler training and assessment details: To be confirmed directly. No detection performance or universal credential is implied.",
        href: "https://mold-dog.com/about/",
      },
    ],
    steps: [
      "Discuss handler and canine suitability with the provider.",
      "Confirm training, team assessment and ongoing evaluation arrangements, plus any local requirements.",
      steps[2],
    ],
    timeline,
    costs,
  },
};

// Join editorial content by ID, never catalog order or a mutable display name.
export function getEducationPathways(catalog: readonly Category[]) {
  return catalog.map((category) => ({
    category,
    pathway: educationPathways[category.id],
  }));
}
