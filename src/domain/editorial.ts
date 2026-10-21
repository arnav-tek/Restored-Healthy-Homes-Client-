export const certificationKinds = [
  "Professional certification",
  "Training / continuing education",
  "Provider training and assessment",
] as const;
export interface CertificationFields {
  introduction: string;
  providerName: string;
  kind: (typeof certificationKinds)[number];
  providerUrl: string;
  description: string;
  requirements: string;
  steps: string[];
  timeline: string;
  costs: string;
}
export interface CertificationEntry extends CertificationFields {
  readonly categoryId: string;
  readonly status: "draft" | "published";
}
export function projectCertification(
  entry: CertificationEntry,
): CertificationFields | null {
  return entry.status === "published"
    ? {
        introduction: entry.introduction,
        providerName: entry.providerName,
        kind: entry.kind,
        providerUrl: entry.providerUrl,
        description: entry.description,
        requirements: entry.requirements,
        steps: [...entry.steps],
        timeline: entry.timeline,
        costs: entry.costs,
      }
    : null;
}
