import Link from "next/link";
import { ArrowUpRight, LayoutDashboard, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Notice } from "@/components/ui/notice";
export function DashboardShell({
  area,
  children,
}: {
  area: "member" | "admin";
  children: ReactNode;
}) {
  return (
    <div className="container dashboard-page">
      <div className="dashboard-top">
        <span className="demo-pill">Demo workspace</span>
        <Link href="/directory" className="text-link">
          Public directory <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <Notice>
        {area === "member" ? (
          <>
            <strong>Local member demo.</strong> Changes stay in this tab until
            refresh or reset. Nothing is sent, published or saved permanently.
          </>
        ) : (
          <>
            <strong>Local admin demo.</strong> Decisions affect this tab’s demo
            only. Nothing is sent to applicants, published or saved permanently.
          </>
        )}
      </Notice>
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <p>Preview workspaces</p>
          <nav aria-label="Demo workspaces">
            <Link
              href="/demo/member"
              aria-current={area === "member" ? "page" : undefined}
            >
              <UserRound size={18} aria-hidden="true" />
              Member overview
            </Link>
            <Link
              href="/demo/admin"
              aria-current={area === "admin" ? "page" : undefined}
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              Admin overview
            </Link>
          </nav>
          <p className="dashboard-sidebar-note">
            Explore the foundations of your future workspace.
          </p>
        </aside>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
