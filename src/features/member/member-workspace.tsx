"use client";
import Link from "next/link";
import { useRef } from "react";
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
      <header className="dashboard-heading">
        <p className="section-label">
          Member · {query.section === "qa" ? "Q&A" : query.section}
        </p>
        <h1 id="workspace-title" tabIndex={-1}>
          {titles[query.section]}
        </h1>
      </header>
      <div className="workspace-business">
        <h2 data-testid="selected-business">{profile.businessName}</h2>
        <p>
          {profile.city}, {profile.state}
        </p>
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
          <section className="workspace-next">
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
            <Link
              className="button"
              href={href({ section: "profile", record: record.id })}
            >
              Review your profile
            </Link>
          </section>
          {(record.decisionReason || record.suspensionReason) && (
            <section className="workspace-note">
              <h2>Review details</h2>
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
          <div className="workspace-shortcuts">
            <Link href={href({ section: "inquiries", record: record.id })}>
              <strong>{inbox.length} inquiries</strong>
              <span>View your inquiries</span>
            </Link>
            <Link href={href({ section: "membership", record: record.id })}>
              <strong>Membership details</strong>
              <span>View status and individual category prices</span>
            </Link>
          </div>
          <p className="field-help">{memberEligibilityMessage(record)}</p>
          <Link className="text-link" href="/list-your-business">
            Try the public application
          </Link>
        </>
      )}
      {query.section === "profile" && (
        <>
          <p>
            Only profile fields can be edited here. Approval, subscription,
            suspension and verification decisions are protected.
          </p>
          <section className="panel" aria-labelledby="edit-heading">
            <h2 id="edit-heading">Edit profile</h2>
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
          <details className="panel member-editor member-public-preview">
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
        </>
      )}
      {query.section === "inquiries" && (
        <section className="panel member-inbox">
          <h2>Inquiry inbox</h2>
          <p>
            Email delivery is not connected yet.
          </p>
          {inbox.length ? (
            inbox.map((item) => (
              <details key={item.id}>
                <summary>{item.subject}</summary>
                <p>Sender: {item.sender}</p>
                <p>{item.message}</p>
              </details>
            ))
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
        <section className="panel">
          <h2>Subscription</h2>
          <p>
            Read-only status: <strong>{record.subscription}</strong>. Approval
            alone does not make a listing public.
          </p>
          <div className="rate-list">
            {selectedCategories.map((category) => (
              <div key={category.id}>
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
