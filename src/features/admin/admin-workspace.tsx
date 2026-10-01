"use client";
import Link from "next/link";
import { demoPublicDirectory, demoDashboardCounts } from "@/domain/demo-member";
import { useDemoCatalog, useDemoSession } from "@/features/member/demo-session";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";
import { PublicPreviewContent } from "@/features/member/public-preview-content";
import { RecordStatus } from "@/features/dashboard/record-status";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { ApplicationReview } from "./application-review";
import { DecisionForm } from "./decision-form";
import { CredentialReview } from "./credential-review";
import { CategoryLabels } from "./category-labels";
import { RecordRegister } from "./record-register";

export function AdminWorkspace({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state, resetVersion } = useDemoSession();
  const { query, href } = useDashboardNavigation("admin");
  const sessionCatalog = useDemoCatalog(catalog);
  const record = state.records.find((item) => item.id === query.record);
  const counts = demoDashboardCounts(state.records);
  const publicRecords = demoPublicDirectory(state.records);
  const titles: Record<string, string> = {
    overview: "Your directory at a glance",
    applications: "Applications",
    listings: "Listings",
    credentials: "Credentials",
    categories: "Categories",
  };
  const reviewing =
    ["applications", "listings", "credentials"].includes(query.section) &&
    !!query.record;
  return (
    <>
      <header className="dashboard-heading">
        <p className="section-label">Admin · {query.section}</p>
        <h1 id="workspace-title" tabIndex={-1}>
          {reviewing
            ? record
              ? `Review ${record.profile.businessName}`
              : "Session record unavailable"
            : titles[query.section]}
        </h1>
        <p>
          {query.section === "overview"
            ? "Current session records, with each decision kept separate."
            : query.section === "applications"
              ? "Review business details and decide applications."
              : query.section === "listings"
                ? "Manage eligibility and explore the session directory."
                : query.section === "credentials"
                  ? "Review each submitted claim on its own."
                  : "Manage display names without changing category identity or pricing."}
        </p>
      </header>
      {query.section === "overview" && (
        <>
          <div className="workspace-metrics">
            <Link
              href={href({
                section: "applications",
                record: "",
                status: "pending",
                q: "",
                suspension: "all",
              })}
            >
              <span>Pending applications</span>
              <strong>{counts.pending}</strong>
              <small>Review applications</small>
            </Link>
            <Link
              href={href({
                section: "listings",
                record: "",
                status: "all",
                q: "",
                suspension: "all",
              })}
            >
              <span>Eligible listings</span>
              <strong>{counts.eligible}</strong>
              <small>Explore listing status</small>
            </Link>
            <Link
              href={href({
                section: "credentials",
                record: "",
                status: "all",
                q: "",
                suspension: "all",
              })}
            >
              <span>Unverified claims</span>
              <strong>{counts.unverified}</strong>
              <small>Review credentials</small>
            </Link>
          </div>
          <section className="workspace-next">
            <h2>
              {counts.pending
                ? "Applications ready for a demo review"
                : "No pending applications"}
            </h2>
            <p>
              {counts.pending
                ? "Open an application to check its details. Approval never activates a subscription."
                : "All current sample applications have a decision. New applications submitted in this tab will appear here."}
            </p>
            <Link
              className="button"
              href={href({
                section: "applications",
                status: counts.pending ? "pending" : "all",
                q: "",
                suspension: "all",
                record: "",
              })}
            >
              Open applications
            </Link>
          </section>
          <div className="workspace-shortcuts">
            <Link
              href={href({
                section: "listings",
                suspension: "suspended",
                status: "all",
                q: "",
                record: "",
              })}
            >
              <strong>{counts.suspended} suspended records</strong>
              <span>Review suspension and eligibility</span>
            </Link>
            <Link href={href({ section: "categories", record: "" })}>
              <strong>{sessionCatalog.length} category labels</strong>
              <span>Rename labels; preserve prices and associations</span>
            </Link>
          </div>
          <p className="field-help">
            Counts describe {counts.applications} fictional records in this tab,
            not platform activity. Session changes never update the public
            directory.
          </p>
        </>
      )}
      {reviewing && (
        <>
          <Link
            className="text-link workspace-back"
            href={href({ record: "" })}
          >
            ← Back to {query.section}
          </Link>
          {!record ? (
            <div className="workspace-empty">
              <h2>This session record is no longer available</h2>
              <p>
                Refresh or reset clears submitted applications. Return to the
                list to choose a current example.
              </p>
            </div>
          ) : (
            <div key={`${record.id}-${resetVersion}`}>
              <RecordStatus record={record} />
              {(record.decisionReason || record.suspensionReason) && (
                <div className="workspace-note">
                  {record.decisionReason && (
                    <p>Demo decision reason: {record.decisionReason}</p>
                  )}
                  {record.suspensionReason && (
                    <p>
                      Demo suspension / reinstatement reason:{" "}
                      {record.suspensionReason}
                    </p>
                  )}
                </div>
              )}
              {query.section === "applications" && (
                <ApplicationReview record={record} catalog={sessionCatalog} />
              )}
              {query.section === "listings" && (
                <>
                  <DecisionForm record={record} purpose="listing" />
                  <Link
                    className="text-link"
                    href={href({ section: "applications", record: record.id })}
                  >
                    Review this application
                  </Link>
                </>
              )}
              {query.section === "credentials" && (
                <CredentialReview record={record} />
              )}
              <div className="workspace-detail-links">
                <Link
                  href={href({
                    section:
                      query.section === "credentials"
                        ? "applications"
                        : "credentials",
                    record: record.id,
                  })}
                >
                  {query.section === "credentials"
                    ? "Application details"
                    : "Review credentials"}
                </Link>
                {query.section !== "listings" && (
                  <Link href={href({ section: "listings", record: record.id })}>
                    Listing status
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {!reviewing &&
        ["applications", "listings", "credentials"].includes(query.section) && (
          <RecordRegister catalog={sessionCatalog} />
        )}
      {query.section === "categories" && (
        <CategoryLabels key={resetVersion} catalog={sessionCatalog} />
      )}
      {query.section === "listings" && (
        <section className="panel session-directory-panel">
          <h2>Session-only directory preview</h2>
          <p>
            Approved, active and not suspended. Only public fields appear here;
            the real public directory remains unchanged.
          </p>
          <p role="status">
            {publicRecords.length} eligible{" "}
            {publicRecords.length === 1 ? "listing" : "listings"}
          </p>
          <div data-testid="session-directory">
            {publicRecords.map((profile) => (
              <article
                className="member-public-preview admin-public-record"
                key={profile.id}
              >
                <details>
                  <summary>{profile.businessName}</summary>
                  <PublicPreviewContent
                    profile={profile}
                    catalog={sessionCatalog}
                  />
                </details>
              </article>
            ))}
          </div>
          {!publicRecords.length && (
            <p className="workspace-empty">
              No eligible listings. Approval alone is insufficient; sample
              subscriptions are read-only.
            </p>
          )}
        </section>
      )}
    </>
  );
}
