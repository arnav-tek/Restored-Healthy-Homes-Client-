"use client";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { dashboardSections, type DashboardArea } from "@/validation/dashboard";
import { useDashboardNavigation } from "./use-dashboard-navigation";
import { SessionReset } from "./session-reset";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { WorkspaceGate } from "@/features/demo-sign-in/workspace-gate";
import { SignOutButton } from "@/features/demo-sign-in/sign-out-button";
import { demoAccounts } from "@/domain/demo-identity";

export function DashboardShell({
  area,
  children,
}: {
  area: DashboardArea;
  children: ReactNode;
}) {
  const { query, href } = useDashboardNavigation(area);
  const { state, drafts } = useDemoSession();
  const ready = useDemoReady();
  const router = useRouter();
  const mobile = useRef<HTMLDetailsElement>(null);
  const previous = useRef(
    `${area}/${query.section === "qa" ? "Q&A" : query.section}/${query.record}`,
  );
  useEffect(() => {
    const next = `${area}/${query.section === "qa" ? "Q&A" : query.section}/${query.record}/${query.question}/${query.answer}/${query.queue}/${query.consultation}/${query.review}`;
    if (mobile.current) mobile.current.open = false;
    if (previous.current !== next)
      document.getElementById("workspace-title")?.focus();
    previous.current = next;
  }, [
    area,
    query.section,
    query.record,
    query.question,
    query.answer,
    query.queue,
    query.consultation,
    query.review,
  ]);
  if (!ready || !state.identity || state.identity.kind !== area)
    return <WorkspaceGate area={area} ready={ready} returnTo={href({})} />;
  const links = (
    <nav aria-label={`${area === "member" ? "Member" : "Admin"} sections`}>
      {dashboardSections[area].map((section) => (
        <Link
          key={section}
          href={href({
            section,
            record: area === "admin" ? "" : query.record,
            consultation: "",
            review: "",
          })}
          aria-current={query.section === section ? "page" : undefined}
          onClick={() => {
            if (mobile.current) mobile.current.open = false;
            if (section === query.section)
              document.getElementById("workspace-title")?.focus();
          }}
        >
          {section === "qa"
            ? "Q&A"
            : section[0].toUpperCase() + section.slice(1)}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="container dashboard-page workspace-page">
      <div className="dashboard-top">
        <span className="demo-pill">
          {area === "member" ? "Member" : "Admin"} Workspace
        </span>
        <Link href="/directory" className="text-link">
          Public directory ↗
        </Link>
      </div>
      <div className="workspace-notice">
        <strong>Your workspace.</strong> Manage your profile, review activity and keep track of your next steps.
      </div>
      <div className="demo-account-bar">
        <span
          data-testid="demo-identity"
          data-account={state.identity.accountId}
        >
          Account:{" "}
          {
            demoAccounts(state.applicationId).find(
              (account) => account.id === state.identity?.accountId,
            )?.label
          }
        </span>
        <SignOutButton label="Switch account" returnTo={href({})} />
      </div>
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar workspace-sidebar">
          <div className="workspace-desktop-nav">
            <p>
              {area === "member" ? "Your business" : "Directory management"}
            </p>
            {links}
          </div>
          <details ref={mobile} className="workspace-mobile-nav">
            <summary>
              {area === "member" ? "Member" : "Admin"} menu ·{" "}
              {query.section === "qa" ? "Q&A" : query.section}
            </summary>
            {links}
          </details>
          <div className="workspace-other">
            <p>Other workspace</p>
            <nav aria-label="Workspaces">
              <Link href={area === "member" ? "/demo/admin" : "/demo/member"}>
                {area === "member" ? "Admin overview" : "Member overview"}
              </Link>
            </nav>
          </div>
          <SessionReset onReset={() => router.replace(`/demo/${area}`)} />
        </aside>
        <div className="dashboard-content">
          {Object.keys(drafts).length > 0 && (
            <p className="draft-note">
              Unsaved drafts are kept in this tab as you navigate. Save in the
              relevant form or reset to discard.
            </p>
          )}
          <p role="status" className="session-status workspace-feedback">
            {state.notice}
          </p>
          <noscript>
            <p>
              Enable JavaScript for local actions. Forms are disabled; navigation and content remain available.
            </p>
          </noscript>
          {children}
        </div>
      </div>
    </div>
  );
}
