"use client";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { dashboardSections, type DashboardArea } from "@/validation/dashboard";
import { useDashboardNavigation } from "./use-dashboard-navigation";
import { SessionReset } from "./session-reset";
import { useDemoSession } from "@/features/member/demo-session";

export function DashboardShell({
  area,
  children,
}: {
  area: DashboardArea;
  children: ReactNode;
}) {
  const { query, href } = useDashboardNavigation(area);
  const { state, drafts } = useDemoSession();
  const router = useRouter();
  const mobile = useRef<HTMLDetailsElement>(null);
  const previous = useRef(`${area}/${query.section}/${query.record}`);
  useEffect(() => {
    const next = `${area}/${query.section}/${query.record}`;
    if (mobile.current) mobile.current.open = false;
    if (previous.current !== next)
      document.getElementById("workspace-title")?.focus();
    previous.current = next;
  }, [area, query.section, query.record]);
  const links = (
    <nav aria-label={`${area === "member" ? "Member" : "Admin"} sections`}>
      {dashboardSections[area].map((section) => (
        <Link
          key={section}
          href={href({ section, record: area === "admin" ? "" : query.record })}
          aria-current={query.section === section ? "page" : undefined}
          onClick={() => {
            if (mobile.current) mobile.current.open = false;
            if (section === query.section)
              document.getElementById("workspace-title")?.focus();
          }}
        >
          {section[0].toUpperCase() + section.slice(1)}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="container dashboard-page workspace-page">
      <div className="dashboard-top">
        <span className="demo-pill">
          {area === "member" ? "Member" : "Admin"} demo workspace
        </span>
        <Link href="/directory" className="text-link">
          Public directory ↗
        </Link>
      </div>
      <div className="workspace-notice">
        <strong>Local demo.</strong> Fictional records; nothing is sent or
        published. Refresh, full-page navigation or reset clears changes and
        drafts. These pages are not account access.
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
              {area === "member" ? "Member" : "Admin"} menu · {query.section}
            </summary>
            {links}
          </details>
          <div className="workspace-other">
            <p>Other demo workspace</p>
            <nav aria-label="Demo workspaces">
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
              Enable JavaScript for local demo actions. Forms are disabled;
              navigation and sample content remain available.
            </p>
          </noscript>
          {children}
        </div>
      </div>
    </div>
  );
}
