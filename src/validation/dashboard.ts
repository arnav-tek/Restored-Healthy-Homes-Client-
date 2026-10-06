import { categories } from "../domain/categories";
import { consultationStatuses } from "../domain/consultation";
export const dashboardSections = {
  member: [
    "overview",
    "profile",
    "inquiries",
    "membership",
    "qa",
    "consultations",
    "reviews",
  ],
  admin: [
    "overview",
    "applications",
    "listings",
    "credentials",
    "categories",
    "qa",
    "consultations",
    "reviews",
  ],
} as const;
export type DashboardArea = keyof typeof dashboardSections;
export interface DashboardQuery {
  review: string;
  reviewStatus: string;
  professional: string;
  consultation: string;
  consultationStatus: string;
  assignment: "all" | "assigned" | "unassigned";
  question: string;
  answer: string;
  queue: "questions" | "answers";
  qaStatus: string;
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
  const question = single("question", 100);
  const answer = single("answer", 100);
  const qaStatus = single("qaStatus", 12);
  const consultation = single("consultation", 100);
  const consultationStatus = single("consultationStatus", 12);
  const assignment = single("assignment", 12);
  const review = single("review", 100);
  const reviewStatus = single("reviewStatus", 12);
  const professional = single("professional", 100);
  return {
    review: area === "admin" && /^[a-z0-9-]+$/.test(review) ? review : "",
    reviewStatus:
      area === "admin" &&
      ["pending", "published", "rejected"].includes(reviewStatus)
        ? reviewStatus
        : "all",
    professional:
      area === "admin" && /^[a-z0-9-]+$/.test(professional) ? professional : "",
    consultation: /^demo-consultation-[1-9]\d*$/.test(consultation)
      ? consultation
      : "",
    consultationStatus: (consultationStatuses as readonly string[]).includes(
      consultationStatus,
    )
      ? consultationStatus
      : "all",
    assignment:
      assignment === "assigned" || assignment === "unassigned"
        ? assignment
        : "all",
    question: /^[a-z0-9-]+$/.test(question) ? question : "",
    answer: /^[a-z0-9-]+$/.test(answer) ? answer : "",
    queue: single("queue", 12) === "answers" ? "answers" : "questions",
    qaStatus: ["pending", "published", "rejected"].includes(qaStatus)
      ? qaStatus
      : "all",
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
  if (validated.section === "reviews") {
    if (area === "admin") {
      if (validated.review) canonical.set("review", validated.review);
      if (validated.reviewStatus !== "all")
        canonical.set("reviewStatus", validated.reviewStatus);
      if (validated.professional)
        canonical.set("professional", validated.professional);
    }
    return `/demo/${area}?${canonical}`;
  }
  if (validated.record) canonical.set("record", validated.record);
  if (validated.section === "consultations") {
    if (validated.consultation)
      canonical.set("consultation", validated.consultation);
    if (validated.consultationStatus !== "all")
      canonical.set("consultationStatus", validated.consultationStatus);
    if (area === "admin") {
      if (validated.category) canonical.set("category", validated.category);
      if (validated.assignment !== "all")
        canonical.set("assignment", validated.assignment);
    }
    return `/demo/${area}?${canonical}`;
  }
  if (area === "admin" || validated.section === "qa") {
    if (validated.category) canonical.set("category", validated.category);
    if (validated.q) canonical.set("q", validated.q);
  }
  if (validated.section === "qa") {
    if (validated.question) canonical.set("question", validated.question);
    if (area === "admin") {
      if (validated.answer) canonical.set("answer", validated.answer);
      if (validated.queue === "answers") canonical.set("queue", "answers");
      if (validated.qaStatus !== "all")
        canonical.set("qaStatus", validated.qaStatus);
    }
  }
  if (area === "admin") {
    if (validated.status !== "all") canonical.set("status", validated.status);
    if (validated.suspension !== "all")
      canonical.set("suspension", validated.suspension);
  }
  return `/demo/${area}${canonical.size ? `?${canonical}` : ""}`;
}
