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
import { parseDemoSignIn } from "@/validation/demo-sign-in";

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
}: {
  children: ReactNode;
  publicQaSeed: readonly PublicQuestion[];
  publicProfessionalIds: readonly string[];
  publicReviewSeed: PublicReviewSnapshot;
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
    reduce(action);
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
export function useDemoCatalog(catalog: readonly ApplicationCategory[]) {
  const { state } = useDemoSession();
  return catalog.map((item) => ({
    ...item,
    name: state.categoryNames[item.id] ?? item.name,
  }));
}
