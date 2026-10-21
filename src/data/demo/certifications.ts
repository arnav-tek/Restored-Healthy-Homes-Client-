import { educationPathways } from "../content/education";
import type { CertificationEntry } from "../../domain/editorial";

// Public reference copy only. No private credentials or verification records.
export const demoCertificationEntries: readonly CertificationEntry[] =
  Object.entries(educationPathways).flatMap(([categoryId, pathway]) => {
    const option = pathway?.options[0];
    return pathway && option
      ? [
          {
            categoryId,
            status: "draft" as const,
            introduction: pathway.introduction,
            providerName: option.name,
            providerUrl: option.href,
            kind: option.kind,
            description: option.description,
            requirements:
              "Confirm current entry requirements directly with the selected provider.",
            steps: [...pathway.steps],
            timeline: pathway.timeline,
            costs: pathway.costs,
          },
        ]
      : [];
  });
