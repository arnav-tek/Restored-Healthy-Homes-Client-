export const resourceCategories = [
  { id: "planning", label: "Project planning" },
  { id: "professionals", label: "For professionals" },
  { id: "platform", label: "Using the platform" },
  { id: "stories", label: "Community stories" },
] as const;
export type ResourceCategory = (typeof resourceCategories)[number]["id"];
export interface ResourceArticle {
  readonly slug: string;
  readonly category: ResourceCategory;
  readonly title: string;
  readonly summary: string;
  readonly editorialStatus: "sample";
  readonly sections: readonly {
    readonly heading: string;
    readonly paragraphs: readonly string[];
  }[];
}
