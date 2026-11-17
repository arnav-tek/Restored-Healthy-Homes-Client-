import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import {
  adminOperations,
  OperationsDataError,
} from "@/data/supabase/admin-operations";
import { operationsQuery } from "@/validation/admin-operations";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedFeatured } from "./connected-featured";
import { ConnectedReport, ReportFilter } from "./connected-report";
import "./connected-operations.css";
export async function ConnectedOperationsPage({
  query,
  report = false,
}: {
  query: Record<string, string | string[] | undefined>;
  report?: boolean;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (typeof v !== "string") notFound();
    params.set(k, v);
  }
  const input = operationsQuery(params, report);
  if (!input) notFound();
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  if (!identity)
    redirect(`/login?returnTo=/admin/${report ? "reports" : "featured"}`);
  let state,
    error = "";
  try {
    state = await adminOperations(client, input);
  } catch (e) {
    error =
      e instanceof OperationsDataError
        ? e.message
        : "Operations data is temporarily unavailable.";
  }
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} admin />
      <section id="private-account" className="panel application-form-panel">
        <header className="page-heading">
          <h1>{report ? "Operational reporting" : "Featured listings"}</h1>
          <nav
            className="account-navigation"
            aria-label="Administrator sections"
          >
            <Link href="/admin/applications">Applications</Link>
            <Link
              href="/admin/featured"
              aria-current={!report ? "page" : undefined}
            >
              Featured listings
            </Link>
            <Link
              href="/admin/reports"
              aria-current={report ? "page" : undefined}
            >
              Reports
            </Link>
            <Link href="/admin/categories">Categories</Link>
            <Link href="/admin/content">Content</Link>
          </nav>
        </header>
        {state ? (
          state.kind === "report" ? (
            <ConnectedReport report={state} />
          ) : (
            <ConnectedFeatured key={identity.id} initial={state} />
          )
        ) : (
          <>
            {report && (
              <ReportFilter
                month={
                  params.get("month") ?? new Date().toISOString().slice(0, 7)
                }
              />
            )}
            <p role="alert">{error}</p>
            <Link
              className="text-link"
              href={report ? "/admin/reports" : "/admin/featured"}
            >
              Try loading saved data again
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
