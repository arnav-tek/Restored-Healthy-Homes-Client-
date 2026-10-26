"use client";
import {
  createContext,
  use,
  useCallback,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  createDemoSession,
  reduceDemoSession,
  type DemoSession,
  type DemoMemberAction,
} from "@/domain/demo-member";
import { getDemoSessionSeed } from "@/data/demo/member-session";
import type { ApplicationCategory } from "./profile-fields-form";
import type { PublicQuestion } from "@/domain/qa";
import type { PublicReviewSnapshot } from "@/domain/review";
import type { PublicProfile } from "@/domain/professional";
import { parseDemoSignIn } from "@/validation/demo-sign-in";
import { sessionCategories } from "@/domain/session-catalog";

const seed = getDemoSessionSeed();
export type DemoDraft = Record<string, string | string[]>;

const DemoSessionContext = createContext<{
  state: DemoSession;
  dispatch: (action: DemoMemberAction) => void;
  drafts: Record<string, DemoDraft>;
  setDraft: (key: string, draft: DemoDraft | null) => void;
  resetVersion: number;
} | null>(null);
export function DemoSessionProvider({
  children,
  publicQaSeed,
  publicProfessionalIds,
  publicReviewSeed,
  publicProfiles,
}: {
  children: ReactNode;
  publicQaSeed: readonly PublicQuestion[];
  publicProfessionalIds: readonly string[];
  publicReviewSeed: PublicReviewSnapshot;
  publicProfiles: readonly PublicProfile[];
}) {
  const [state, reduce] = useReducer(
    (current: DemoSession, action: DemoMemberAction) =>
      reduceDemoSession(current, action, seed),
    seed,
    () =>
      createDemoSession(
        seed,
        publicQaSeed,
        publicProfessionalIds,
        publicReviewSeed,
        publicProfiles,
      ),
  );
  const [drafts, setDrafts] = useState<Record<string, DemoDraft>>({});
  const [resetVersion, setResetVersion] = useState(0);
  function dispatch(action: DemoMemberAction) {
    if (
      action.type === "reset" ||
      action.type === "demo-sign-out" ||
      (action.type === "demo-sign-in" &&
        !state.identity &&
        parseDemoSignIn({ ...action.fields }, state.applicationId).ok)
    ) {
      setDrafts({});
      setResetVersion((value) => value + 1);
    }
    reduce(
      action.type === "submit"
        ? { ...action, submittedOn: new Date().toISOString().slice(0, 10) }
        : action,
    );
  }
  const setDraft = useCallback((key: string, draft: DemoDraft | null) => {
    setDrafts((current) => {
      const next = { ...current };
      if (draft) next[key] = draft;
      else delete next[key];
      return next;
    });
  }, []);
  return (
    <DemoSessionContext
      value={{ state, dispatch, drafts, setDraft, resetVersion }}
    >
      {children}
    </DemoSessionContext>
  );
}
export function useDemoDraft(key: string) {
  const { drafts, setDraft } = useDemoSession();
  return {
    draft: drafts[key],
    saveDraft: (draft: DemoDraft) => setDraft(key, draft),
    clearDraft: () => setDraft(key, null),
  };
}
export function useDemoSession() {
  const session = use(DemoSessionContext);
  if (!session) throw new Error("Session provider is required");
  return session;
}
export function useDemoCatalog<T extends { id: string; name: string }>(
  catalog: readonly T[],
): readonly (T | ApplicationCategory)[];
export function useDemoCatalog(
  catalog: readonly { id: string; name: string }[],
) {
  const { state } = useDemoSession();
  const suppliedIds = new Set(catalog.map((item) => item.id));
  return [
    ...catalog.map((item) => ({
      ...item,
      name: state.categoryNames[item.id] ?? item.name,
    })),
    ...state.addedCategories
      .filter((item) => !suppliedIds.has(item.id))
      .map(({ id, name, monthlyUsd }) => ({
        id,
        name: state.categoryNames[id] ?? name,
        monthlyUsd,
        previewPrice: true,
      })),
  ];
}
export function useSessionCategories() {
  return sessionCategories(useDemoSession().state);
}
