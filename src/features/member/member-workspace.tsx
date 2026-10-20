"use client";
import { ShowcasePreferences } from "./showcase-preferences";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { formatMonthlyPrice } from "@/domain/categories";
import {
  memberEligibilityMessage,
  memberFormFields,
  projectDemoPublic,
} from "@/domain/demo-member";
import { PublicPreviewContent } from "./public-preview-content";
import {
  ProfileFieldsForm,
  type ApplicationCategory,
} from "./profile-fields-form";
import { useDemoSession, useDemoCatalog } from "./demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { MemberQa } from "@/features/qa/member-qa";
import { MemberReviews } from "@/features/reviews/member-reviews";
import { MemberConsultations } from "@/features/consultations/member-consultations";
import { RecordStatus } from "@/features/dashboard/record-status";

const breadcrumbLabels: Record<string, string> = {
  overview: "Overview",
  profile: "Profile",
  inquiries: "Inquiries",
  qa: "Q&A",
  consultations: "Consultations",
  reviews: "Reviews",
  membership: "Membership",
};

export function MemberWorkspace({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state, dispatch, resetVersion } = useDemoSession();
  const { query, href, pending } = useDashboardNavigation("member");
  const sessionCatalog = useDemoCatalog(catalog);
  const feedback = useRef<HTMLParagraphElement>(null);
  const identity = state.identity;
  const record = state.records.find(
    (item) => identity?.kind === "member" && item.id === identity.memberId,
  );

  if (!record || (query.record && query.record !== record.id))
    return (
      <section className="workspace-empty">
        <h1 id="workspace-title" tabIndex={-1}>
          Member record unavailable for this account
        </h1>
        <p>
          Sign-in selects the professional. A URL cannot change that identity.
        </p>
        <Link className="text-link" href={href({ record: "" })}>
          Return to your member workspace
        </Link>
      </section>
    );

  const profile = record.profile;
  const selectedCategories = sessionCatalog.filter((category) =>
    profile.categoryIds.includes(category.id),
  );
  const inbox = state.inquiries.filter((item) => item.memberId === record.id);
  const titles: Record<string, string> = {
    reviews: "Your published reviews",
    consultations: "Your consultations",
    qa: "Your Q&A workspace",
    overview: "Your business at a glance",
    profile: "Your business profile",
    inquiries: "Your inquiries",
    membership: "Your membership",
  };

  return (
    <>
      <header className="workspace-header">
        <div className="workspace-header-main">
          <nav aria-label="Breadcrumb" className="workspace-breadcrumb">
            <span>Member</span>
            <span className="breadcrumb-separator" aria-hidden="true">›</span>
            <span>{breadcrumbLabels[query.section] ?? "Overview"}</span>
          </nav>
          <h1 id="workspace-title" tabIndex={-1} className="workspace-title">
            {titles[query.section]}
          </h1>
          <p className="workspace-description">
            Manage your profile, preview your directory presence, and track visitor inquiries.
          </p>
        </div>
        <div className="workspace-header-action">
          <Link href="/directory" className="workspace-public-link">
            Public directory ↗
          </Link>
        </div>
      </header>

      <div className="workspace-business-card">
        <div className="business-card-icon">
          <Building2 size={20} aria-hidden="true" />
        </div>
        <div className="business-card-info">
          <h2 data-testid="selected-business" className="business-card-name">
            {profile.businessName}
          </h2>
          <p className="business-card-loc">
            <MapPin size={14} aria-hidden="true" />
            <span>{profile.city}, {profile.state}</span>
          </p>
        </div>
      </div>

      {query.section === "qa" && (
        <MemberQa
          key={resetVersion}
          memberId={record.id}
          disabled={pending || state.selectedId !== record.id}
        />
      )}
      {query.section === "reviews" && <MemberReviews />}
      {query.section === "consultations" && (
        <MemberConsultations
          key={resetVersion}
          disabled={pending || state.selectedId !== record.id}
        />
      )}
      {query.section === "overview" && (
        <>
          <RecordStatus record={record} />
          <section className="overview-banner-card">
            <div className="banner-content">
              <h2>Next steps</h2>
              <p>
                {record.suspended
                  ? "Your listing is suspended. Profile edits cannot remove suspension; contact the administrator for review."
                  : record.approval === "pending"
                    ? "Your application is awaiting a review. You can check your details while it is pending."
                    : record.approval === "rejected"
                      ? "Review the decision below and refine your profile. Editing does not change the decision."
                      : record.subscription !== "active"
                        ? "Your application is approved, but its subscription is inactive. Membership here is read-only."
                        : "Your listing meets the publication requirements. Review your profile and explore the inquiry inbox."}
              </p>
            </div>
            <Link
              className="button banner-action-btn"
              href={href({ section: "profile", record: record.id })}
            >
              <span>Review your profile</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </section>

          {(record.decisionReason || record.suspensionReason) && (
            <section className="workspace-note admin-detail-card">
              <h2 className="admin-detail-heading">Review details</h2>
              {record.decisionReason && (
                <p>Decision reason: {record.decisionReason}</p>
              )}
              {record.suspensionReason && (
                <p>
                  Suspension / reinstatement reason:{" "}
                  {record.suspensionReason}
                </p>
              )}
            </section>
          )}

          <div className="overview-bottom-grid">
            <section className="overview-actions-card">
              <h2 className="overview-card-title">Quick shortcuts</h2>
              <div className="quick-actions-grid">
                <Link
                  className="quick-action-item"
                  href={href({ section: "inquiries", record: record.id })}
                >
                  <span className="action-item-label">
                    <strong>{inbox.length} inquiries</strong>
                    <span className="action-item-sub">View your inquiries</span>
                  </span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>

                <Link
                  className="quick-action-item"
                  href={href({ section: "membership", record: record.id })}
                >
                  <span className="action-item-label">
                    <strong>Membership details</strong>
                    <span className="action-item-sub">View status and category prices</span>
                  </span>
                  <ArrowRight size={14} className="action-item-arrow" aria-hidden="true" />
                </Link>
              </div>
            </section>

            <section className="overview-activity-card">
              <h2 className="overview-card-title">Membership status</h2>
              <p className="field-help">{memberEligibilityMessage(record)}</p>
              <div className="public-link-wrap">
                <Link className="text-link" href="/list-your-business">
                  Try the public application ↗
                </Link>
              </div>
            </section>
          </div>
        </>
      )}

      {query.section === "profile" && (
        <div className="member-profile-section">
          <ShowcasePreferences key={resetVersion} memberId={record.id} />
          <p className="field-help">
            Only profile fields can be edited here. Approval, subscription,
            suspension and verification decisions are protected.
          </p>
          <section className="panel admin-detail-card" aria-labelledby="edit-heading">
            <h2 id="edit-heading" className="admin-detail-heading">Edit profile</h2>
            <ProfileFieldsForm
              disabled={pending}
              key={`${record.id}-${state.revision}-${resetVersion}`}
              draftKey={`profile:${record.id}`}
              catalog={sessionCatalog}
              initial={memberFormFields(record)}
              submitLabel="Update local preview"
              onValid={(next) => {
                dispatch({ type: "edit", id: record.id, profile: next });
                requestAnimationFrame(() => feedback.current?.focus());
              }}
            />
            <p
              ref={feedback}
              role="status"
              tabIndex={-1}
              className="session-status"
            >
              {state.notice}
            </p>
          </section>
          <details className="panel member-editor member-public-preview admin-detail-card">
            <summary>Public profile</summary>
            <p>
              This previews saved local content, including ineligible
              applications. It does not publish or update the public directory.
            </p>
            <PublicPreviewContent
              profile={projectDemoPublic(record)}
              catalog={sessionCatalog}
            />
            <p className="field-help">
              Application contact name and email are excluded.
            </p>
          </details>
        </div>
      )}

      {query.section === "inquiries" && (
        <section className="panel admin-detail-card member-inbox">
          <h2 className="admin-detail-heading">Inquiry inbox</h2>
          <p><Link className="text-link" href={href({ section: "qa" })}>Open category question inbox →</Link></p>
          <p className="field-help">
            Email delivery is not connected yet.
          </p>
          {inbox.length ? (
            <div className="inbox-list">
              {inbox.map((item) => (
                <details key={item.id} className="inbox-item-card">
                  <summary>{item.subject}</summary>
                  <div className="inbox-item-body">
                    <p className="inbox-sender"><strong>Sender:</strong> {item.sender}</p>
                    <p className="inbox-message">{item.message}</p>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              <h3>No messages yet.</h3>
              <p>
                New inquiries will appear here when delivery is connected.
              </p>
            </div>
          )}
        </section>
      )}

      {query.section === "membership" && (
        <section className="panel admin-detail-card">
          <h2 className="admin-detail-heading">Subscription</h2>
          <p>
            Read-only status: <strong>{record.subscription}</strong>. Approval
            alone does not make a listing public.
          </p>
          <div className="rate-list">
            {selectedCategories.map((category) => (
              <div key={category.id} className="rate-item">
                <span>{category.name}</span>
                <strong>
                  {formatMonthlyPrice(category.monthlyUsd)}
                  <span> / month</span>
                </strong>
              </div>
            ))}
          </div>
          <p className="field-help">
            Individual-category prices in USD. Multi-category pricing is pending
            confirmation; no combined total, checkout or payment changes are
            available.
          </p>
        </section>
      )}
    </>
  );
}
