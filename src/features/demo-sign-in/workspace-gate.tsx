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
        <p className="section-label">Demo workspace</p>
        <h1>
          {!ready
            ? "Checking demo session"
            : state.identity
              ? "This is a different demo workspace"
              : "Demo sign-in required"}
        </h1>
        <p>
          This {area} preview uses a fictional account selection. It is an
          interface simulation, not secure route protection.
        </p>
        {!ready ? (
          <p>
            Enable JavaScript to use the session-only demo. No signed-in
            workspace is shown before the session is ready.
          </p>
        ) : state.identity ? (
          <div className="filter-actions">
            <Link className="button" href={demoDashboard(state.identity)}>
              Open your dashboard
            </Link>
            <SignOutButton label="Switch demo account" returnTo={returnTo} />
          </div>
        ) : (
          <Link className="button" href={demoLoginHref(returnTo)}>
            Go to demo sign-in
          </Link>
        )}
        <p className="field-help">
          Refresh clears identity and demo records. Public browsing and
          applications remain available without sign-in.
        </p>
        <Link className="text-link" href="/directory">
          Browse professionals
        </Link>
      </div>
    </section>
  );
}
