import type { ApprovalStatus, SubscriptionStatus } from "./professional";
import { isPubliclyEligible } from "./listing";
import { categories } from "./categories";
import { parseCategoryName, parseReviewReason } from "../validation/admin";

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
  categoryNames: Record<string, string>;
  selectedId: string;
  applicationId: string | null;
  revision: number;
  notice: string;
}
export type DemoMemberAction =
  | { type: "submit"; profile: MemberProfileFields }
  | { type: "edit"; id: string; profile: MemberProfileFields }
  | { type: "select"; id: string }
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
export function createDemoSession(seed: DemoSessionSeed): DemoSession {
  return {
    ...structuredClone(seed),
    categoryNames: Object.fromEntries(
      categories.map(({ id, name }) => [id, name]),
    ),
    selectedId: seed.records[0].id,
    applicationId: null,
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
    case "reset":
      return {
        ...createDemoSession(seed),
        revision,
        notice: "Demo session reset. All local changes were cleared.",
      };
    case "select":
      return state.records.some((record) => record.id === action.id)
        ? { ...state, selectedId: action.id, notice: "", revision }
        : state;
    case "submit": {
      const record: DemoMemberRecord = {
        id: "demo-local-application",
        exampleLabel: "Your fictional application",
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
        selectedId: record.id,
        applicationId: record.id,
        revision,
        notice:
          "Demo application created in this tab. Nothing was sent to the owner.",
      };
    }
    case "edit":
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
        notice: "Local preview updated. The public directory has not changed.",
      };
    case "rename-category": {
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
            notice: "Category label updated in this demo session only.",
          }
        : state;
    }
    case "decide":
    case "suspend":
    case "credential": {
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
