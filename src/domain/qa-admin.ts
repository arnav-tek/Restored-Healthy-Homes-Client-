export type QaStatus = "pending" | "published" | "hidden" | "rejected";
export type QaKind = "question" | "answer";
export type QaAction = "publish" | "reject" | "hide" | "restore";
export interface QaAdminFilters {
  queue: "questions" | "answers";
  status: QaStatus | "all";
  category: string;
  q: string;
  page: number;
  id: string | null;
  parent: string | null;
}
export interface QaDecisionInput {
  kind: QaKind;
  id: string;
  version: number;
  parentVersion: number | null;
  action: QaAction;
  reason: string;
  note: string;
}
export interface QaAdminItem {
  kind: QaKind;
  id: string;
  questionId: string;
  title: string;
  body: string;
  categoryId: string;
  status: QaStatus;
  version: number;
  parentStatus: QaStatus;
  parentVersion: number;
  note: string;
  attribution: string;
  answerCount: number;
  canPublish: boolean;
}
export interface QaHistory {
  version: number;
  action: QaAction;
  previousStatus: QaStatus;
  nextStatus: QaStatus;
  actorId: string;
  reason: string;
  note: string;
  body: string;
  title: string;
  at: string;
}
export interface QaAdminWorkspace {
  queue: "questions" | "answers";
  page: number;
  hasNext: boolean;
  total: number;
  items: QaAdminItem[];
  detail: (QaAdminItem & { history: QaHistory[] }) | null;
  catalog: { id: string; name: string }[];
  counts: {
    questions: number;
    answers: number;
    pendingQuestions: number;
    pendingAnswers: number;
  };
}
export function qaActions(status: QaStatus): QaAction[] {
  return status === "pending"
    ? ["publish", "reject"]
    : status === "published"
      ? ["hide", "reject"]
      : status === "hidden"
        ? ["restore", "reject"]
        : ["restore"];
}
