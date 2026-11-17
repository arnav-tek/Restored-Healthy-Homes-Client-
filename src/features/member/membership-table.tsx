"use client";
import type { Category } from "@/domain/categories";
import { publicDirectoryCatalog } from "@/domain/public-application";
import { useDemoSession } from "./demo-session";
import { MembershipTableView } from "./membership-table-view";
export function MembershipTable({ catalog }: { catalog: readonly Category[] }) {
  const { state } = useDemoSession();
  return (
    <MembershipTableView
      categories={publicDirectoryCatalog(catalog, state)}
      provisionalIds={state.addedCategories.map((c) => c.id)}
    />
  );
}
