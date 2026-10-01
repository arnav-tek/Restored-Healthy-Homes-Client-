"use client";
import {
  createContext,
  use,
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

const seed = getDemoSessionSeed();
export type DemoDraft = Record<string, string | string[]>;

const DemoSessionContext = createContext<{
  state: DemoSession;
  dispatch: (action: DemoMemberAction) => void;
  drafts: Record<string, DemoDraft>;
  setDraft: (key: string, draft: DemoDraft | null) => void;
  resetVersion: number;
} | null>(null);
export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [state, reduce] = useReducer(
    (current: DemoSession, action: DemoMemberAction) =>
      reduceDemoSession(current, action, seed),
    seed,
    createDemoSession,
  );
  const [drafts, setDrafts] = useState<Record<string, DemoDraft>>({});
  const [resetVersion, setResetVersion] = useState(0);
  function dispatch(action: DemoMemberAction) {
    if (action.type === "reset") {
      setDrafts({});
      setResetVersion((value) => value + 1);
    }
    reduce(action);
  }
  function setDraft(key: string, draft: DemoDraft | null) {
    setDrafts((current) => {
      const next = { ...current };
      if (draft) next[key] = draft;
      else delete next[key];
      return next;
    });
  }
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
  if (!session) throw new Error("Demo session provider is required");
  return session;
}
export function useDemoCatalog(catalog: readonly ApplicationCategory[]) {
  const { state } = useDemoSession();
  return catalog.map((item) => ({
    ...item,
    name: state.categoryNames[item.id] ?? item.name,
  }));
}
