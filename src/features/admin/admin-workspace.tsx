"use client";
import Link from "next/link";
import {
  FileText,
  List,
  Shield,
  Star,
  Ban,
  Tag,
  Users,
  ArrowRight,
} from "lucide-react";
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
import { AdminQa } from "@/features/qa/admin-qa";
import { AdminReviews } from "@/features/reviews/admin-reviews";
import { moderationReviews } from "@/domain/review-session";
import { AdminConsultations } from "@/features/consultations/admin-consultations";
import { RecordRegister } from "./record-register";
import { ListingEditor } from "./listing-editor";
import { AdminMemberships } from "./membership-controls";
import { AdminAnalytics } from "./admin-analytics";
import { AdminContent } from "./admin-content";
import { CertificationEditor } from "./certification-editor";
import { ApplicationPublication } from "@/features/profiles/application-publication";

const tabTitles: Record<string, string> = {
  certifications: "Certification pathways",
  analytics: "Directory analytics",
  membership: "Membership management",
  featured: "Featured listings",
  content: "Resources & publishing",
  reviews: "Review Management",
  consultations: "Consultation requests",
  qa: "Questions & Answers",
  overview: "Your directory at a glance",
  applications: "Business Applications",
  listings: "Directory Listings",
  credentials: "Credential Verification",
  categories: "Professional Categories",
};

const breadcrumbLabels: Record<string, string> = {
  certifications: "Certifications",
  analytics: "Analytics",
  membership: "Membership",
  featured: "Featured",
  content: "Content",
  overview: "Overview",
  applications: "Applications",
  listings: "Listings",
  credentials: "Credentials",
  categories: "Categories",
  qa: "Q&A",
  consultations: "Consultations",
  reviews: "Reviews",
};

const tabDescriptions: Record<string, string> = {
  certifications: "Edit external program references, entry requirements, steps and planning information.",
  analytics: "Explore membership, category and application trends from the current session.",
  membership: "Demonstrate membership changes and their effect on listing eligibility.",
  featured: "Manage sample entitlements and preview eligible featured placements.",
  content: "Create, review and publish sample resources in the showcase preview.",
  overview: "Manage your directory, review activity and keep track of your next steps.",
  applications: "Review applications from professionals requesting directory listings.",
  listings: "Manage professional profiles, visibility, and listing eligibility.",
  credentials: "Review professional credential claims and supporting information.",
  categories: "Manage directory category labels and their associations.",
  qa: "Review community questions and manage published responses.",
  consultations: "Review consultation inquiries and their current status.",
  reviews: "Review visitor feedback and manage published reviews.",
};

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
  const pendingReviewsCount = moderationReviews(state.reviews).filter(
    (review) => review.status === "pending",
  ).length;

  const reviewing =
    ["applications", "listings", "credentials"].includes(query.section) &&
    !!query.record;

  return (
    <>
      <header className="workspace-header">
        <div className="workspace-header-main">
          <nav aria-label="Breadcrumb" className="workspace-breadcrumb">
            <span>Admin</span>
            <span className="breadcrumb-separator" aria-hidden="true">›</span>
            <span>{breadcrumbLabels[query.section] ?? "Overview"}</span>
            {reviewing && record && (
              <>
                <span className="breadcrumb-separator" aria-hidden="true">›</span>
                <span className="breadcrumb-current">
                  {record.profile.businessName}
                </span>
              </>
            )}
          </nav>
          <h1 id="workspace-title" tabIndex={-1} className="workspace-title">
            {reviewing
              ? record
                ? `Review ${record.profile.businessName}`
                : "Record unavailable"
              : tabTitles[query.section]}
          </h1>
          <p className="workspace-description">
            {reviewing
              ? "Review business details, contact information and credentials."
              : tabDescriptions[query.section]}
          </p>
        </div>
        <div className="workspace-header-action">
          <Link href="/directory" className="workspace-public-link">
            Public directory ↗
          </Link>
        </div>
      </header>

      {query.section === "qa" && <AdminQa key={resetVersion} />}
      {query.section === "analytics" && <AdminAnalytics key={resetVersion} catalog={sessionCatalog} />}
      {query.section === "membership" && <AdminMemberships key={resetVersion} />}
      {query.section === "featured" && <AdminMemberships key={resetVersion} featured />}
      {query.section === "content" && <AdminContent key={resetVersion} />}
      {query.section === "certifications" && <CertificationEditor key={resetVersion} />}
      {query.section === "reviews" && <AdminReviews key={resetVersion} />}
      {query.section === "consultations" && (
        <AdminConsultations key={resetVersion} />
      )}

      {query.section === "overview" && (
        <div className="overview-container">
          <section className="panel admin-showcase-guide">
            <div><p className="section-tag">Workflow showcase</p><h2>From application to an eligible listing</h2><p>Review an application, simulate active membership, then open its listing to edit the profile. Featured placement still requires eligibility.</p></div>
            <div className="admin-inline-actions"><Link className="button" href={href({ section: "membership", record: "" })}>Try membership workflow</Link><Link className="text-link" href={href({ section: "analytics", record: "" })}>View analytics →</Link></div>
            <p className="field-help">Changes stay in this tab and clear on refresh. No payments or notifications are sent.</p>
          </section>
          {/* 6 Metric Cards in 3x2 Grid */}
          <div className="overview-metrics-grid">
            {/* Card 1: Pending applications */}
            <Link
              className="overview-metric-card"
              href={href({
                section: "applications",
                record: "",
                status: "pending",
                q: "",
                suspension: "all",
              })}
            >
              <div className="metric-icon-wrap icon-peach">
                <FileText size={20} aria-hidden="true" />
              </div>
              <div className="metric-content">
                <h2 className="metric-title">Pending applications</h2>
                <span className="metric-number">{counts.pending}</span>
                <span className="metric-link-text">
                  Review applications <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Card 2: Eligible listings */}
            <Link
              className="overview-metric-card"
              href={href({
                section: "listings",
                record: "",
                status: "all",
                q: "",
                suspension: "all",
              })}
            >
              <div className="metric-icon-wrap icon-sage">
                <List size={20} aria-hidden="true" />
              </div>
              <div className="metric-content">
                <h2 className="metric-title">Eligible listings</h2>
                <span className="metric-number">{counts.eligible}</span>
                <span className="metric-link-text">
                  Explore listing status <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Card 3: Unverified claims */}
            <Link
              className="overview-metric-card"
              href={href({
                section: "credentials",
                record: "",
                status: "all",
                q: "",
                suspension: "all",
              })}
            >
              <div className="metric-icon-wrap icon-peach">
                <Shield size={20} aria-hidden="true" />
              </div>
              <div className="metric-content">
                <h2 className="metric-title">Unverified claims</h2>
                <span className="metric-number">{counts.unverified}</span>
                <span className="metric-link-text">
                  Review credentials <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Card 4: Pending reviews */}
            <Link
              className="overview-metric-card"
              href={href({
                section: "reviews",
                review: "",
                reviewStatus: "pending",
                professional: "",
              })}
            >
              <div className="metric-icon-wrap icon-sage">
                <Star size={20} aria-hidden="true" />
              </div>
              <div className="metric-content">
                <h2 className="metric-title">Pending reviews</h2>
                <span className="metric-number">{pendingReviewsCount}</span>
                <span className="metric-link-text">
                  Review visitor feedback <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Card 5: Suspended records */}
            <Link
              className="overview-metric-card"
              href={href({
                section: "listings",
                suspension: "suspended",
                status: "all",
                q: "",
                record: "",
              })}
            >
              <div className="metric-icon-wrap icon-peach">
                <Ban size={20} aria-hidden="true" />
              </div>
              <div className="metric-content">
                <h2 className="metric-title">Suspended records</h2>
                <span className="metric-number">{counts.suspended}</span>
                <span className="metric-link-text">
                  Review suspension and eligibility <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Card 6: Category labels */}
            <Link
              className="overview-metric-card"
              href={href({ section: "categories", record: "" })}
            >
              <div className="metric-icon-wrap icon-sage">
                <Tag size={20} aria-hidden="true" />
              </div>
              <div className="metric-content">
                <h2 className="metric-title">Category labels</h2>
                <span className="metric-number">{sessionCatalog.length}</span>
                <span className="metric-link-text">
                  Rename labels, preserve prices and associations <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </div>

          {/* Banner: Applications ready for a review */}
          <section className="overview-banner-card">
            <div className="banner-icon-wrap">
              <FileText size={22} aria-hidden="true" />
            </div>
            <div className="banner-content">
              <h2>
                {counts.pending
                  ? "Applications ready for a review"
                  : "No pending applications"}
              </h2>
              <p>
                {counts.pending
                  ? "Open an application to check its details. Approval never activates a subscription."
                  : "All current applications have a decision. New applications will appear here."}
              </p>
            </div>
            <Link
              className="button banner-action-btn"
              href={href({
                section: "applications",
                status: counts.pending ? "pending" : "all",
                q: "",
                suspension: "all",
                record: "",
              })}
            >
              <span>Open applications</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>

          {/* Bottom 2 Columns: Quick Actions & Recent Activity */}
          <div className="overview-bottom-grid">
            {/* Left Card: Quick Actions */}
            <section className="overview-actions-card">
              <h2 className="overview-card-title">Quick actions</h2>
              <p className="overview-card-desc">
                Common admin tasks to keep your directory up to date.
              </p>
              <div className="quick-actions-grid">
                <Link
                  className="quick-action-item"
                  href={href({
                    section: "applications",
                    record: "",
                    status: "all",
                    q: "",
                    suspension: "all",
                  })}
                >
                  <span className="action-item-icon" aria-hidden="true">
                    <FileText size={16} />
                  </span>
                  <span className="action-item-label">Review applications</span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>

                <Link
                  className="quick-action-item"
                  href={href({ section: "categories", record: "" })}
                >
                  <span className="action-item-icon" aria-hidden="true">
                    <Tag size={16} />
                  </span>
                  <span className="action-item-label">Manage category labels</span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>

                <Link
                  className="quick-action-item"
                  href={href({
                    section: "listings",
                    record: "",
                    status: "all",
                    q: "",
                    suspension: "all",
                  })}
                >
                  <span className="action-item-icon" aria-hidden="true">
                    <List size={16} />
                  </span>
                  <span className="action-item-label">Explore listing status</span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>

                <Link
                  className="quick-action-item"
                  href={href({
                    section: "reviews",
                    review: "",
                    reviewStatus: "all",
                    professional: "",
                  })}
                >
                  <span className="action-item-icon" aria-hidden="true">
                    <Star size={16} />
                  </span>
                  <span className="action-item-label">View recent reviews</span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>

                <Link
                  className="quick-action-item"
                  href={href({
                    section: "credentials",
                    record: "",
                    status: "all",
                    q: "",
                    suspension: "all",
                  })}
                >
                  <span className="action-item-icon" aria-hidden="true">
                    <Shield size={16} />
                  </span>
                  <span className="action-item-label">Review credentials</span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>

                <Link
                  className="quick-action-item"
                  href="/demo/member"
                >
                  <span className="action-item-icon" aria-hidden="true">
                    <Users size={16} />
                  </span>
                  <span className="action-item-label">Member overview</span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>
              </div>
            </section>

            {/* Right Card: Recent Review Activity */}
            <section className="overview-activity-card">
              <div className="activity-card-header">
                <h2 className="overview-card-title">Review queues</h2>
                <Link
                  href={href({
                    section: "applications",
                    record: "",
                    status: "all",
                    q: "",
                    suspension: "all",
                  })}
                  className="activity-all-link"
                >
                  Browse applications <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon-wrap icon-peach">
                    <FileText size={16} aria-hidden="true" />
                  </div>
                  <div className="activity-details">
                    <strong className="activity-title">Application review</strong>
                    <span className="activity-sub">
                      {counts.pending} pending application{counts.pending === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="activity-item">
                  <div className="activity-icon-wrap icon-sage">
                    <List size={16} aria-hidden="true" />
                  </div>
                  <div className="activity-details">
                    <strong className="activity-title">Public listing eligibility</strong>
                    <span className="activity-sub">
                      {counts.eligible} eligible listing{counts.eligible === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="activity-item">
                  <div className="activity-icon-wrap icon-peach">
                    <Shield size={16} aria-hidden="true" />
                  </div>
                  <div className="activity-details">
                    <strong className="activity-title">Credential review</strong>
                    <span className="activity-sub">
                      {counts.unverified} pending claim{counts.unverified === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="activity-item">
                  <div className="activity-icon-wrap icon-sage">
                    <Star size={16} aria-hidden="true" />
                  </div>
                  <div className="activity-details">
                    <strong className="activity-title">Pending reviews</strong>
                    <span className="activity-sub">
                      {pendingReviewsCount} pending review{pendingReviewsCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="field-help overview-footer-note">
                Counts describe {counts.applications} records available for review and directory management.
              </p>
            </section>
          </div>
          <section className="panel admin-activity"><h2>Session activity</h2><p>Recent admin changes in this tab. This preview is not a permanent audit log.</p>{state.adminActivity.length ? <ol>{state.adminActivity.map((item) => <li key={item.id}>{item.summary}</li>)}</ol> : <p>No admin changes yet. Try reviewing an application or updating a membership scenario.</p>}</section>
        </div>
      )}

      {reviewing && (
        <div className="review-detail-container">
          <Link
            className="text-link workspace-back-link"
            href={href({ record: "" })}
          >
            ← Back to {breadcrumbLabels[query.section]}
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
              <ApplicationPublication memberId={record.id} />
              {(record.decisionReason || record.suspensionReason) && (
                <div className="workspace-note">
                  {record.decisionReason && (
                    <p>Decision reason: {record.decisionReason}</p>
                  )}
                  {record.suspensionReason && (
                    <p>
                      Suspension / reinstatement reason:{" "}
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
                  <ListingEditor record={record} catalog={sessionCatalog} />
                  <div className="admin-inline-actions"><Link className="text-link" href={href({ section: "membership", record: record.id })}>Manage membership scenario</Link><Link className="text-link" href={href({ section: "featured", record: record.id })}>Manage featured placement</Link></div>
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
        </div>
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
          <h2>Directory overview</h2>
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
              No eligible listings. Approval alone is insufficient; use Membership to simulate an active subscription.
            </p>
          )}
        </section>
      )}
    </>
  );
}
