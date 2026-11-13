import type { PublicQuestion, QuestionFields } from "./qa";
export interface QaCatalogItem {
  id: string;
  name: string;
  active: boolean;
}
export interface PublicQaSnapshot {
  catalog: QaCatalogItem[];
  questions: PublicQuestion[];
}
export interface OwnQaAnswer {
  parentStatus?: "pending" | "published" | "hidden" | "rejected";
  id: string;
  questionId: string;
  body: string;
  status: "pending" | "published" | "rejected" | "hidden";
  version: number;
}
export interface MemberQaWorkspace {
  eligible: boolean;
  catalog: QaCatalogItem[];
  questions: Pick<PublicQuestion, "id" | "title" | "categoryId">[];
  question: (QuestionFields & { id: string }) | null;
  answers: OwnQaAnswer[];
  page: number;
  hasNext: boolean;
}
export interface QuestionSubmission extends QuestionFields {
  requestId: string;
}
export interface AnswerSubmission {
  questionId: string;
  body: string;
  version?: number;
}
