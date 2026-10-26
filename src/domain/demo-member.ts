import type { ApprovalStatus, SubscriptionStatus } from "./professional";
import type { PublicProfile } from "./professional";
import { eligiblePublicIds, seedPublicRecords } from "./public-session";
import { reduceInquiry, type InquiryAction } from "./inquiry-session";
import { validSessionPhoto, type SessionPhoto } from "../validation/sample-photo";
import {
  membershipStatuses,
  type AdminArticle,
  type AdminShowcaseAction,
} from "./admin-showcase";
import { parseAdminArticle } from "../validation/admin-showcase";
import { parseApplication } from "../validation/application";
import { isPubliclyEligible } from "./listing";
import type { PublicReviewSnapshot } from "./review";
import { categories } from "./categories";
import type { Category } from "./categories";
import { sessionCategories } from "./session-catalog";
import {
  parseNewCategory,
  parseCertification,
} from "../validation/admin-editors";
import { type CertificationEntry, type CertificationFields } from "./editorial";
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
  reduceBillingDemo,
  type BillingDemoAction,
  type BillingDemoAttempt,
} from "./billing-demo";
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
  publicDisplayName?: string;
  publicEmail?: string;
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
  readonly submittedOn?: string;
  readonly id: string;
  readonly exampleLabel: string;
  readonly freeConsultation?: boolean;
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
  readonly professionalId?: string;
  readonly id: string;
  readonly memberId: string;
  readonly sender: string;
  readonly subject: string;
  readonly message: string;
}
export interface DemoSessionSeed {
  certifications?: readonly CertificationEntry[];
  articles?: readonly AdminArticle[];
  records: readonly DemoMemberRecord[];
  inquiries: readonly DemoInboxItem[];
}
export interface DemoSession extends DemoSessionSeed {
  readonly photos: Readonly<Record<string, SessionPhoto>>;
  readonly currentInquiryByProfessional: Readonly<Record<string, string>>;
  readonly publicProfiles: readonly PublicProfile[] | null;
  certifications: readonly CertificationEntry[];
  addedCategories: readonly Category[];
  articles: readonly AdminArticle[];
  adminActivity: readonly { id: number; summary: string }[];
  billing: readonly BillingDemoAttempt[];
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
  | InquiryAction
  | { type: "save-profile-photo"; id: string; photo: SessionPhoto | null }
  | {
      type: "create-category";
      fields: { name: string; description: string; monthlyUsd: number };
    }
  | {
      type: "save-certification";
      categoryId: string;
      fields: CertificationFields;
    }
  | { type: "publish-certification"; categoryId: string; published: boolean }
  | AdminShowcaseAction
  | BillingDemoAction
  | { type: "set-free-consultation"; id: string; enabled: boolean }
  | ReviewAction
  | { type: "demo-sign-in"; fields: DemoSignInFields }
  | { type: "demo-sign-out" }
  | ConsultationAction
  | { type: "request-consultation"; fields: ConsultationFields }
  | { type: "new-consultation" }
  | QaAction
  | { type: "submit-question"; question: QuestionFields }
  | { type: "new-question" }
  | { type: "submit"; profile: MemberProfileFields; submittedOn?: string }
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
    ...(input.publicDisplayName
      ? { publicDisplayName: input.publicDisplayName }
      : {}),
    ...(input.publicEmail ? { publicEmail: input.publicEmail } : {}),
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
  publicProfiles: readonly PublicProfile[] | null = null,
): DemoSession {
  return {
    ...structuredClone(seed),
    photos: {},
    currentInquiryByProfessional: {},
    publicProfiles: publicProfiles === null ? null : structuredClone(publicProfiles),
    records: seedPublicRecords(structuredClone(seed.records), publicProfiles ?? []),
    articles: structuredClone(seed.articles ?? []),
    certifications: structuredClone(seed.certifications ?? []),
    addedCategories: [],
    adminActivity: [],
    billing: [],
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
  const next = reduceDemoSessionCore(state, action, seed);
  const labels: Partial<Record<DemoMemberAction["type"], string>> = {
    edit: "Profile updated",
    decide: "Application decision updated",
    suspend: "Listing visibility updated",
    credential: "Credential decision updated",
    "rename-category": "Category label updated",
    "simulate-membership": "Membership scenario updated",
    "set-featured": "Featured entitlement updated",
    "save-article": "Resource draft saved",
    "publish-article": "Resource publication updated",
    "create-category": "Category created",
    "save-certification": "Certification draft saved",
    "publish-certification": "Certification publication updated",
  };
  const label = labels[action.type];
  if (next === state || state.identity?.kind !== "admin" || !label) return next;
  const recordId = "id" in action ? action.id : "";
  const record = next.records.find((item) => item.id === recordId);
  return {
    ...next,
    adminActivity: [
      {
        id: next.revision,
        summary: `${label}${record ? ` · ${record.profile.businessName}` : ""}`,
      },
      ...next.adminActivity,
    ].slice(0, 30),
  };
}

function reduceDemoSessionCore(
  state: DemoSession,
  action: DemoMemberAction,
  seed: DemoSessionSeed,
): DemoSession {
  const revision = state.revision + 1;
  switch (action.type) {
    case "submit-inquiry":
    case "new-inquiry":
      return reduceInquiry(state, action);
    case "save-profile-photo": {
      if (!state.identity || (state.identity.kind === "member" && state.identity.memberId !== action.id) ||
        !state.records.some((record) => record.id === action.id) || (action.photo !== null && !validSessionPhoto(action.photo))) return state;
      const photos = { ...state.photos };
      if (action.photo) photos[action.id] = { dataUrl: action.photo.dataUrl, width: action.photo.width, height: action.photo.height };
      else delete photos[action.id];
      return { ...state, photos, revision, notice: action.photo ? "Business photo saved in this demo session. Nothing was uploaded." : "Saved business photo removed." };
    }
    case "billing-start":
    case "billing-result":
    case "billing-cancel":
    case "billing-close":
      return reduceBillingDemo(state, action);
    case "create-category": {
      if (state.identity?.kind !== "admin") return state;
      const fields = parseNewCategory(action.fields, sessionCategories(state));
      if (!fields) return state;
      const category: Category = {
        id: `demo-category-${revision}`,
        billingKey: `demo-membership-${revision}`,
        ...fields,
      };
      return {
        ...state,
        revision,
        addedCategories: [...state.addedCategories, category],
        categoryNames: { ...state.categoryNames, [category.id]: category.name },
        notice:
          "Category created for this tab. Existing prices and associations are unchanged.",
      };
    }
    case "save-certification": {
      if (
        state.identity?.kind !== "admin" ||
        !sessionCategories(state).some((item) => item.id === action.categoryId)
      )
        return state;
      const fields = parseCertification({
        ...action.fields,
        steps: action.fields.steps.join("\n"),
      });
      if (!fields) return state;
      return {
        ...state,
        revision,
        certifications: [
          ...state.certifications.filter(
            (item) => item.categoryId !== action.categoryId,
          ),
          { categoryId: action.categoryId, ...fields, status: "draft" },
        ],
        notice:
          "Certification pathway saved as a draft. Publishing is a separate step.",
      };
    }
    case "publish-certification": {
      if (
        state.identity?.kind !== "admin" ||
        typeof action.published !== "boolean"
      )
        return state;
      const entry = state.certifications.find(
        (item) => item.categoryId === action.categoryId,
      );
      if (
        !entry ||
        !parseCertification({ ...entry, steps: entry.steps.join("\n") })
      )
        return state;
      return {
        ...state,
        revision,
        certifications: state.certifications.map((item) =>
          item.categoryId === action.categoryId
            ? { ...item, status: action.published ? "published" : "draft" }
            : item,
        ),
        notice: action.published
          ? "Pathway published to Certifications in this tab. This does not verify any member credentials."
          : "Pathway returned to draft; the original reference copy is restored.",
      };
    }
    case "simulate-membership":
    case "set-featured": {
      if (state.identity?.kind !== "admin" || !parseReviewReason(action.reason))
        return state;
      const record = state.records.find((item) => item.id === action.id);
      if (!record) return state;
      if (
        action.type === "simulate-membership" &&
        !membershipStatuses.includes(action.status)
      )
        return state;
      if (action.type === "set-featured" && typeof action.enabled !== "boolean")
        return state;
      const updated =
        action.type === "simulate-membership"
          ? { ...record, subscription: action.status }
          : {
              ...record,
              featuredEntitlement: action.enabled
                ? ("active" as const)
                : ("none" as const),
            };
      return {
        ...state,
        records: state.records.map((item) =>
          item.id === record.id ? updated : item,
        ),
        billing:
          action.type === "simulate-membership"
            ? state.billing.filter(({ memberId }) => memberId !== record.id)
            : state.billing,
        revision,
        notice:
          "Showcase scenario updated in this tab. No payment or live listing was changed.",
      };
    }
    case "save-article": {
      if (state.identity?.kind !== "admin") return state;
      const fields = parseAdminArticle(action.fields);
      if (
        !fields ||
        (action.id && !state.articles.some((item) => item.id === action.id))
      )
        return state;
      const id = action.id || `demo-article-${revision}`;
      // Editing a published item returns it to draft for deliberate re-publication.
      const article: AdminArticle = { id, ...fields, status: "draft" };
      return {
        ...state,
        revision,
        articles: [...state.articles.filter((item) => item.id !== id), article],
        notice: "Resource saved as a draft in this tab.",
      };
    }
    case "publish-article": {
      if (
        state.identity?.kind !== "admin" ||
        typeof action.published !== "boolean"
      )
        return state;
      const article = state.articles.find((item) => item.id === action.id);
      if (!article || !parseAdminArticle({ ...article })) return state;
      return {
        ...state,
        revision,
        articles: state.articles.map((item) =>
          item.id === article.id
            ? { ...item, status: action.published ? "published" : "draft" }
            : item,
        ),
        notice: action.published
          ? "Resource published to Resources in this tab. Refresh or reset clears it."
          : "Resource returned to draft.",
      };
    }
    case "submit-review":
    case "moderate-review":
    case "new-review": {
      const reviews = reduceReviewAction(
        state.reviews,
        action,
        eligiblePublicIds(state),
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
        billing: state.billing.filter(
          ({ stage }) =>
            !["checkout", "recovery", "cancel-confirmation"].includes(stage),
        ),
        revision,
        notice: "Signed out.",
      };
    case "request-consultation": {
      // Lock this form attempt after success until the explicit "another" action.
      if (state.consultationId !== null) return state;
      const parsed = parseConsultation(
        { ...action.fields },
        sessionCategories(state),
      );
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
      const parsed = parseQuestion(action.question, sessionCategories(state));
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
          state.publicProfiles,
        ),
        revision,
        notice: "Workspace reset. All local changes were cleared.",
      };
    case "submit": {
      const record: DemoMemberRecord = {
        id: "demo-local-application",
        submittedOn:
          action.submittedOn && /^\d{4}-\d{2}-\d{2}$/.test(action.submittedOn)
            ? action.submittedOn
            : undefined,
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
        billing: state.billing.filter(({ memberId }) => memberId !== record.id),
        revision,
        notice:
          "Application prepared. Delivery to the owner is not connected yet.",
      };
    }
    case "set-free-consultation": {
      if (
        typeof action.enabled !== "boolean" ||
        !state.identity ||
        (state.identity.kind === "member" &&
          state.identity.memberId !== action.id)
      )
        return state;
      if (!state.records.some((record) => record.id === action.id))
        return state;
      return {
        ...state,
        revision,
        records: state.records.map((record) =>
          record.id === action.id
            ? { ...record, freeConsultation: action.enabled }
            : record,
        ),
        notice:
          "Free phone consultation preference saved. Public participation labels and matching now reflect it in this tab.",
      };
    }
    case "edit": {
      if (
        !state.identity ||
        (state.identity.kind === "member" &&
          state.identity.memberId !== action.id)
      )
        return state;
      if (!state.records.some((record) => record.id === action.id))
        return state;
      let profile = action.profile;
      if (state.identity.kind === "admin") {
        const parsed = parseApplication(
          {
            ...action.profile,
            services: action.profile.services.join("\n"),
            listedCredentials: action.profile.listedCredentials.join("\n"),
          },
          sessionCategories(state),
        );
        if (!parsed.ok) return state;
        profile = parsed.profile;
      }
      return {
        ...state,
        records: state.records.map((record) =>
          record.id === action.id
            ? {
                ...record,
                profile: copyMemberFields(profile),
                credentials: reconcileCredentials(
                  record.credentials,
                  profile.listedCredentials,
                  `${record.id}-${revision}`,
                ),
              }
            : record,
        ),
        revision,
        billing: state.billing.filter(({ memberId }) => memberId !== action.id),
        notice:
          "Profile saved in this demo session. Billing reviews for this record were cleared.",
      };
    }
    case "rename-category": {
      if (state.identity?.kind !== "admin") return state;
      const catalog = sessionCategories(state);
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
  publicDisplayName?: string;
  publicEmail?: string;
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
    ...(profile.publicDisplayName
      ? { publicDisplayName: profile.publicDisplayName }
      : {}),
    ...(profile.publicEmail ? { publicEmail: profile.publicEmail } : {}),
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
  if (record.id === "demo-local-application" && isPubliclyEligible(record))
    return "This application is visible in the public directory in this tab. Refresh or reset clears it.";
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
