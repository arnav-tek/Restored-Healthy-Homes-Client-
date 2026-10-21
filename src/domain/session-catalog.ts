import { categories, type Category } from "./categories";

export interface SessionCatalogState {
  addedCategories: readonly Category[];
  categoryNames: Record<string, string>;
}
export function sessionCategories(
  state: SessionCatalogState,
): readonly Category[] {
  return [...categories, ...state.addedCategories].map((category) => ({
    ...category,
    name: state.categoryNames[category.id] ?? category.name,
  }));
}
