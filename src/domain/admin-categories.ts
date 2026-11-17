export interface AdminCategory {
  id: string;
  name: string;
  description: string;
  monthlyUsd: number;
  billingKey: string;
  active: boolean;
}
export interface CategoryChange {
  id: string;
  categoryId: string;
  actorId: string;
  action: "create" | "rename";
  reason: string;
  previousName: string | null;
  name: string;
  version: number;
  at: string;
}
export interface AdminCategories {
  version: number;
  items: AdminCategory[];
  history: CategoryChange[];
}
export type CategoryMutation =
  | {
      action: "rename";
      id: string;
      name: string;
      version: number;
      reason: string;
    }
  | {
      action: "create";
      id: string;
      name: string;
      version: number;
      reason: string;
      description: string;
      monthlyUsd: number;
      billingKey: string;
    };
