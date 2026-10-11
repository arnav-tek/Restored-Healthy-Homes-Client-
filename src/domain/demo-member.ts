import type { ApprovalStatus, SubscriptionStatus } from "./professional";
import { isPubliclyEligible } from "./listing";
import type { PublicReviewSnapshot } from "./review";
import { categories } from "./categories";
import { parseCategoryName, parseReviewReason } from "../validation/admin";
import type {
  DemoQuestionSubmission,
  QuestionFields,
  PublicQuestion,
} from "./qa";
import {
  createQaSession,
  reduceQaAction,
  type QaAction,
  type QaSession,
} from "./qa-session";
import { parseQuestion } from "../validation/qa";
import {
  consultationOffer,
  type ConsultationFields,
  type DemoConsultationRequest,
} from "./consultation";
import { parseConsultation } from "../validation/consultation";
import type { DemoIdentity } from "./demo-identity";
import {
  createReviewSession,
  reduceReviewAction,
  type ReviewAction,
  type ReviewSession,
} from "./review-session";
import {
  parseDemoSignIn,
  type DemoSignInFields,
} from "../validation/demo-sign-in";
import {
  reduceConsultationAction,
  type ConsultationAction,
} from "./consultation-session";

export interface MemberProfileFields {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  categoryIds: string[];
  services: string[];
  description: string;
  practices: string;
  listedCredentials: string[];
}
export interface DemoMemberRecord {
  readonly id: string;
  readonly exampleLabel: string;
  readonly approval: ApprovalStatus;
  readonly subscription: SubscriptionStatus;
  readonly suspended: boolean;
  readonly featuredEntitlement: "none" | "active";
  readonly credentials: readonly DemoCredential[];
  readonly decisionReason: string;
  readonly suspensionReason: string;
  profile: Omit<MemberProfileFields, "listedCredentials">;
}
export interface DemoCredential {
  readonly id: string;
  readonly text: string;
  readonly verification: "unverified" | "verified";
}
export interface DemoInboxItem {
  readonly id: string;
  readonly memberId: string;
  readonly sender: string;
  readonly subject: string;
  readonly message: string;
}
export interface DemoSessionSeed {
  records: readonly DemoMemberRecord[];
  inquiries: readonly DemoInboxItem[];
}
export interface DemoSession extends DemoSessionSeed {
  publicProfessionalIds: readonly string[];
  reviews: ReviewSession;
  identity: DemoIdentity | null;
  consultations: readonly DemoConsultationRequest[];
  consultationId: string | null;
  qa: QaSession;
  questions: readonly DemoQuestionSubmission[];
  questionId: string | null;
  categoryNames: Record<string, string>;
  selectedId: string;
  applicationId: string | null;
  revision: number;
  notice: string;
}
export type DemoMemberAction =
  | ReviewAction
  | { type: "demo-sign-in"; fields: DemoSignInFields }
  | { type: "demo-sign-out" }
  | ConsultationAction
  | { type: "request-consultation"; fields: ConsultationFields }
  | { type: "new-consultation" }
  | QaAction
  | { type: "submit-question"; question: QuestionFields }
  | { type: "new-question" }
  | { type: "submit"; profile: MemberProfileFields }
  | { type: "edit"; id: string; profile: MemberProfileFields }
  | {
      type: "decide";
      id: string;
      approval: "approved" | "rejected";
      reason: string;
    }
  | { type: "suspend"; id: string; suspended: boolean; reason: string }
  | {
      type: "credential";
      id: string;
      credentialId: string;
      verification: "unverified" | "verified";
    }
  | { type: "rename-category"; id: string; name: string }
  | { type: "reset" };

// Explicit member-edit allowlist: never merge an arbitrary payload into a record.
export function copyMemberFields(
  input: MemberProfileFields,
): Omit<MemberProfileFields, "listedCredentials"> {
  return {
    name: input.name,
    businessName: input.businessName,
    email: input.email,
    phone: input.phone,
    website: input.website,
    city: input.city,
    state: input.state,
    categoryIds: [...input.categoryIds],
    services: [...input.services],
    description: input.description,
    practices: input.practices,
  };
}
export function createDemoSession(
  seed: DemoSessionSeed,
  publicQaSeed: readonly PublicQuestion[] = [],
  publicProfessionalIds: readonly string[] = [],
  publicReviewSeed?: PublicReviewSnapshot,
): DemoSession {
  return {
    ...structuredClone(seed),
    identity: null,
    publicProfessionalIds: [...publicProfessionalIds],
    reviews: createReviewSession(publicReviewSeed),
    qa: createQaSession(publicQaSeed),
    consultations: [],
    consultationId: null,
    categoryNames: Object.fromEntries(
      categories.map(({ id, name }) => [id, name]),
    ),
    selectedId: seed.records[0].id,
    applicationId: null,
    questions: [],
    questionId: null,
    revision: 0,
    notice: "",
  };
}
export function reduceDemoSession(
  state: DemoSession,
  action: DemoMemberAction,
  seed: DemoSessionSeed,
): DemoSession {
  const revision = state.revision + 1;
  switch (action.type) {
    case "submit-review":
    case "moderate-review":
    case "new-review": {
      const reviews = reduceReviewAction(
        state.reviews,
        action,
        state.publicProfessionalIds,
        state.identity,
      );
      return reviews === state.reviews
        ? state
        : { ...state, reviews, revision };
    }
    case "demo-sign-in": {
      if (state.identity) return state;
      const result = parseDemoSignIn({ ...action.fields }, state.applicationId);
      if (
        !result.ok ||
        (result.identity.kind === "member" &&
          !state.records.some(
            (record) =>
              record.id ===
              (result.identity.kind === "member"
                ? result.identity.memberId
                : ""),
          ))
      )
        return state;
      return {
        ...state,
        identity: result.identity,
        selectedId:
          result.identity.kind === "member"
            ? result.identity.memberId
            : state.selectedId,
        revision,
        notice: "",
      };
    }
    case "demo-sign-out":
      return {
        ...state,
        identity: null,
        revision,
        notice: "Signed out.",
      };
    case "request-consultation": {
      // Lock this form attempt after success until the explicit "another" action.
      if (state.consultationId !== null) return state;
      const parsed = parseConsultation({ ...action.fields });
      if (!parsed.ok) return state;
      const { name, email, categoryId, format, topic } = parsed.fields;
      const request: DemoConsultationRequest = {
        id: `demo-consultation-${revision}`,
        name,
        email,
        categoryId,
        format,
        topic,
        status: "requested",
        paymentStatus: "not-collected",
        offer: { ...consultationOffer },
        providerId: null,
        scheduledAt: null,
        adminNote: "",
      };
      return {
        ...state,
        consultations: [...state.consultations, request],
        consultationId: request.id,
        revision,
      };
    }
    case "new-consultation":
      return state.consultationId === null
        ? state
        : { ...state, consultationId: null, revision };
    case "assign-consultation":
    case "unassign-consultation":
    case "accept-consultation":
    case "decline-consultation":
    case "cancel-consultation":
    case "note-consultation":
      return reduceConsultationAction(state, action);
    case "submit-answer":
    case "moderate-question":
    case "moderate-answer":
      return reduceQaAction(state, action);
    case "submit-question": {
      const parsed = parseQuestion(action.question);
      if (!parsed.ok) return state;
      const question: DemoQuestionSubmission = {
        id: `demo-session-question-${revision}`,
        title: parsed.question.title,
        categoryId: parsed.question.categoryId,
        body: parsed.question.body,
        status: "pending",
      };
      return {
        ...state,
        questions: [...state.questions, question],
        questionId: question.id,
        revision,
      };
    }
    case "new-question":
      return { ...state, questionId: null, revision };
    case "reset":
      return {
        ...createDemoSession(
          seed,
          state.qa.snapshot,
          state.publicProfessionalIds,
          state.reviews.snapshot,
        ),
        revision,
        notice: "Workspace reset. All local changes were cleared.",
      };
    case "submit": {
      const record: DemoMemberRecord = {
        id: "demo-local-application",
        exampleLabel: "Your application",
        approval: "pending",
        subscription: "inactive",
        suspended: false,
        featuredEntitlement: "none",
        credentials: reconcileCredentials(
          [],
          action.profile.listedCredentials,
          `application-${revision}`,
        ),
        decisionReason: "",
        suspensionReason: "",
        profile: copyMemberFields(action.profile),
      };
      return {
        ...state,
        records: [
          ...state.records.filter((item) => item.id !== record.id),
          record,
        ],
        selectedId: state.identity ? state.selectedId : record.id,
        applicationId: record.id,
        revision,
        notice:
          "Application prepared. Delivery to the owner is not connected yet.",
      };
    }
    case "edit":
      if (
        !state.identity ||
        (state.identity.kind === "member" &&
          state.identity.memberId !== action.id)
      )
        return state;
      if (!state.records.some((record) => record.id === action.id))
        return state;
      return {
        ...state,
        records: state.records.map((record) =>
          record.id === action.id
            ? {
                ...record,
                profile: copyMemberFields(action.profile),
                credentials: reconcileCredentials(
                  record.credentials,
                  action.profile.listedCredentials,
                  `${record.id}-${revision}`,
                ),
              }
            : record,
        ),
        revision,
        notice: "Profile draft updated. The public directory has not changed.",
      };
    case "rename-category": {
      if (state.identity?.kind !== "admin") return state;
      const catalog = categories.map((item) => ({
        ...item,
        name: state.categoryNames[item.id],
      }));
      const name = parseCategoryName(action.name, action.id, catalog);
      return name
        ? {
            ...state,
            categoryNames: { ...state.categoryNames, [action.id]: name },
            revision,
            notice: "Category label updated.",
          }
        : state;
    }
    case "decide":
    case "suspend":
    case "credential": {
      if (state.identity?.kind !== "admin") return state;
      const record = state.records.find((item) => item.id === action.id);
      if (!record) return state;
      let updated: DemoMemberRecord;
      if (action.type === "credential") {
        if (
          !record.credentials.some((claim) => claim.id === action.credentialId)
        )
          return state;
        updated = {
          ...record,
          credentials: record.credentials.map((claim) =>
            claim.id === action.credentialId
              ? { ...claim, verification: action.verification }
              : claim,
          ),
        };
      } else {
        const reason = parseReviewReason(action.reason);
        if (!reason) return state;
        if (action.type === "decide") {
          updated = {
            ...record,
            approval: action.approval,
            decisionReason: reason,
          };
        } else {
          if (record.approval !== "approved") return state;
          updated = {
            ...record,
            suspended: action.suspended,
            suspensionReason: reason,
          };
        }
      }
      return {
        ...state,
        records: state.records.map((item) =>
          item.id === updated.id ? updated : item,
        ),
        revision,
        notice: `Local decision updated for ${record.profile.businessName}. Nothing was sent or published.`,
      };
    }
  }
}

// Exact unchanged claims keep identity across reordering. Edited/new/re-added text
// gets a fresh ID and no verification; removed claims have no retained decisions.
export function reconcileCredentials(
  previous: readonly DemoCredential[],
  texts: readonly string[],
  prefix: string,
): DemoCredential[] {
  const remaining = [...previous];
  return texts.map((text, index) => {
    const match = remaining.findIndex((claim) => claim.text === text);
    if (match >= 0) return { ...remaining.splice(match, 1)[0] };
    return { id: `${prefix}-claim-${index}`, text, verification: "unverified" };
  });
}
export function memberFormFields(
  record: DemoMemberRecord,
): MemberProfileFields {
  return {
    ...record.profile,
    listedCredentials: record.credentials.map((claim) => claim.text),
  };
}

export interface DemoPublicPreview {
  id: string;
  businessName: string;
  categoryIds: string[];
  city: string;
  state: string;
  description: string;
  practices: string;
  services: string[];
  credentials: DemoCredential[];
  phone: string;
  website: string;
}
// Explicit public allowlist. Contact identity/email, decisions and notes stay out.
export function projectDemoPublic(record: DemoMemberRecord): DemoPublicPreview {
  const profile = record.profile;
  return {
    id: record.id,
    businessName: profile.businessName,
    categoryIds: [...profile.categoryIds],
    city: profile.city,
    state: profile.state,
    description: profile.description,
    practices: profile.practices,
    services: [...profile.services],
    credentials: record.credentials.map(({ id, text, verification }) => ({
      id,
      text,
      verification,
    })),
    phone: profile.phone,
    website: profile.website,
  };
}
export function demoPublicDirectory(
  records: readonly DemoMemberRecord[],
): DemoPublicPreview[] {
  return records.filter(isPubliclyEligible).map(projectDemoPublic);
}
export function filterDemoRecords(
  records: readonly DemoMemberRecord[],
  filters: { query: string; approval: string; suspension: string },
): DemoMemberRecord[] {
  const query = filters.query.trim().toLocaleLowerCase("en-US");
  return records.filter(
    (record) =>
      (filters.approval === "all" || record.approval === filters.approval) &&
      (filters.suspension === "all" ||
        (filters.suspension === "suspended"
          ? record.suspended
          : !record.suspended)) &&
      [
        record.profile.businessName,
        record.profile.name,
        record.profile.city,
        record.profile.email,
      ].some((value) => value.toLocaleLowerCase("en-US").includes(query)),
  );
}

export function memberEligibilityMessage(record: DemoMemberRecord): string {
  return isPubliclyEligible(record)
    ? "This example meets the approval, active subscription and no-suspension rules. Local edits still do not update the public directory."
    : "This example is not eligible for public listing. Approval, an active subscription and no suspension are all required.";
}
export function demoDashboardCounts(records: readonly DemoMemberRecord[]) {
  return {
    applications: records.length,
    pending: records.filter((record) => record.approval === "pending").length,
    eligible: records.filter(isPubliclyEligible).length,
    suspended: records.filter((record) => record.suspended).length,
    unverified: records.reduce(
      (total, record) =>
        total +
        record.credentials.filter(
          (claim) => claim.verification === "unverified",
        ).length,
      0,
    ),
  };
}
