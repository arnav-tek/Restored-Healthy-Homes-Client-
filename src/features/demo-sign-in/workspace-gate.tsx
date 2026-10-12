"use client";
import Link from "next/link";
import type { DashboardArea } from "@/validation/dashboard";
import { demoDashboard } from "@/domain/demo-identity";
import { demoLoginHref } from "@/validation/demo-sign-in";
import { useDemoSession } from "@/features/member/demo-session";
import { SignOutButton } from "./sign-out-button";
export function WorkspaceGate({
  area,
  ready,
  returnTo,
}: {
  area: DashboardArea;
  ready: boolean;
  returnTo: string;
}) {
  const { state } = useDemoSession();
  return (
    <section className="container demo-gate">
      <div className="panel">
        <p className="section-label section-tag">Workspace</p>
        <h1>
          {!ready
            ? "Checking session"
            : state.identity
              ? "This is a different workspace"
              : "Sign-in required"}
        </h1>
        <p>
          This {area} workspace requires the appropriate account selection.
        </p>
        {!ready ? (
          <p>
            Enable JavaScript to sign in and open your workspace.
          </p>
        ) : state.identity ? (
          <div className="filter-actions">
            <Link className="button" href={demoDashboard(state.identity)}>
              Open your dashboard
            </Link>
            <SignOutButton label="Switch account" returnTo={returnTo} />
          </div>
        ) : (
          <Link className="button" href={demoLoginHref(returnTo)}>
            Go to sign-in
          </Link>
        )}
        <p className="field-help">
          Browse professionals or prepare an application without signing in.
        </p>
        <Link className="text-link" href="/directory">
          Browse professionals
        </Link>
      </div>
    </section>
  );
}
