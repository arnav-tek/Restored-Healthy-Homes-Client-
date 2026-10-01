import { categories } from "../domain/categories";
export const dashboardSections = {
  member: ["overview", "profile", "inquiries", "membership"],
  admin: ["overview", "applications", "listings", "credentials", "categories"],
} as const;
export type DashboardArea = keyof typeof dashboardSections;
export interface DashboardQuery {
  section: string;
  record: string;
  q: string;
  status: string;
  suspension: string;
  category: string;
}
export function parseDashboardQuery(
  area: DashboardArea,
  params: Pick<URLSearchParams, "getAll">,
): DashboardQuery {
  const single = (key: string, max: number) => {
    const values = params.getAll(key);
    return values.length === 1 && values[0].length <= max
      ? values[0].trim()
      : "";
  };
  const section = single("section", 20);
  const record = single("record", 100);
  const status = single("status", 12);
  const suspension = single("suspension", 12);
  const category = single("category", 50);
  return {
    category: categories.some((item) => item.id === category) ? category : "",
    section: (dashboardSections[area] as readonly string[]).includes(section)
      ? section
      : "overview",
    record: /^[a-z0-9-]+$/.test(record) ? record : "",
    q: single("q", 120),
    status: ["pending", "approved", "rejected"].includes(status)
      ? status
      : "all",
    suspension: ["suspended", "clear"].includes(suspension)
      ? suspension
      : "all",
  };
}
export function dashboardHref(
  area: DashboardArea,
  query: DashboardQuery,
  patch: Partial<DashboardQuery> = {},
): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (
      value &&
      value !== "all" &&
      !(key === "section" && value === "overview")
    )
      params.set(key, value);
  }
  const validated = parseDashboardQuery(area, params);
  const canonical = new URLSearchParams();
  if (validated.section !== "overview")
    canonical.set("section", validated.section);
  if (validated.record) canonical.set("record", validated.record);
  if (area === "admin") {
    if (validated.category) canonical.set("category", validated.category);
    if (validated.q) canonical.set("q", validated.q);
    if (validated.status !== "all") canonical.set("status", validated.status);
    if (validated.suspension !== "all")
      canonical.set("suspension", validated.suspension);
  }
  return `/demo/${area}${canonical.size ? `?${canonical}` : ""}`;
}
