"use client";
import { EducationPathwaysView } from "./education-pathways-view";
import type { EducationPathway } from "@/data/content/education";
import {
  useDemoSession,
  useSessionCategories,
} from "@/features/member/demo-session";
import { projectCertification } from "@/domain/editorial";
export function EducationPathways({
  pathways: seed,
}: {
  pathways: readonly {
    category: { id: string; name: string };
    pathway: EducationPathway | undefined;
  }[];
}) {
  const { state } = useDemoSession();
  const catalog = useSessionCategories();
  const pathways = catalog.map((category) => {
    const entry = state.certifications.find(
      (item) => item.categoryId === category.id,
    );
    const published = entry ? projectCertification(entry) : null;
    const pathway: EducationPathway | undefined = published
      ? {
          introduction: published.introduction,
          options: [
            {
              name: published.providerName,
              kind: published.kind,
              description: published.description,
              href: published.providerUrl as `https://${string}`,
            },
          ],
          requirements: published.requirements,
          steps: published.steps,
          timeline: published.timeline,
          costs: published.costs,
        }
      : seed.find((item) => item.category.id === category.id)?.pathway;
    return { category, pathway };
  });
  return <EducationPathwaysView pathways={pathways} />;
}
