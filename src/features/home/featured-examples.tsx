"use client";
import type { PublicProfessional } from "@/domain/professional";
import type { Category } from "@/domain/categories";
import { publicFeaturedExamples } from "@/domain/public-featured";
import { publicDirectoryCatalog } from "@/domain/public-application";
import { useDemoSession } from "@/features/member/demo-session";
import { FeaturedListingsView } from "./featured-listings-view";
export function FeaturedExamples({
  professionals,
  catalog,
  initialFeaturedIds,
}: {
  professionals: readonly PublicProfessional[];
  catalog: readonly Category[];
  initialFeaturedIds: readonly string[];
}) {
  const { state } = useDemoSession();
  return (
    <FeaturedListingsView
      professionals={publicFeaturedExamples(
        professionals,
        initialFeaturedIds,
        state,
      )}
      catalog={publicDirectoryCatalog(catalog, state)}
    />
  );
}
