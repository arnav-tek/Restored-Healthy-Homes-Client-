"use client";
import type { Category } from "@/domain/categories";
import { publicDirectoryCatalog } from "@/domain/public-application";
import { useDemoSession } from "@/features/member/demo-session";
import { CategoryBrowseView } from "./category-browse-view";
export function CategoryBrowse({ catalog }: { catalog: readonly Category[] }) {
  const { state } = useDemoSession();
  return (
    <CategoryBrowseView catalog={publicDirectoryCatalog(catalog, state)} />
  );
}
