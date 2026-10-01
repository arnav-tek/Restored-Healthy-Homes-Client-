"use client";
import { createContext, use, useReducer, type ReactNode } from "react";
import {
  createDemoSession,
  reduceDemoSession,
  type DemoSession,
  type DemoMemberAction,
} from "@/domain/demo-member";
import { getDemoSessionSeed } from "@/data/demo/member-session";
import type { ApplicationCategory } from "./profile-fields-form";

const seed = getDemoSessionSeed();

const DemoSessionContext = createContext<{
  state: DemoSession;
  dispatch: (action: DemoMemberAction) => void;
} | null>(null);
export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    (current: DemoSession, action: DemoMemberAction) =>
      reduceDemoSession(current, action, seed),
    seed,
    createDemoSession,
  );
  return (
    <DemoSessionContext value={{ state, dispatch }}>
      {children}
    </DemoSessionContext>
  );
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
