"use client";
import Link from "next/link";
import { useRef } from "react";
import { useDemoReady } from "@/components/ui/use-demo-ready";
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
import { RecordStatus } from "@/features/dashboard/record-status";

export function MemberWorkspace({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state, dispatch, resetVersion } = useDemoSession();
  const { query, href, navigate, pending } = useDashboardNavigation("member");
  const sessionCatalog = useDemoCatalog(catalog);
  const ready = useDemoReady();
  const feedback = useRef<HTMLParagraphElement>(null);
  const requested = state.records.find((item) => item.id === query.record);
  const record =
    requested ?? state.records.find((item) => item.id === state.selectedId)!;
  const profile = record.profile;
  const selectedCategories = sessionCatalog.filter((category) =>
    profile.categoryIds.includes(category.id),
  );
  const inbox = state.inquiries.filter((item) => item.memberId === record.id);
  const titles: Record<string, string> = {
    overview: "Your business at a glance",
    profile: "Your business profile",
    inquiries: "Your sample inquiries",
    membership: "Your sample membership",
  };
  return (
    <>
      <header className="dashboard-heading">
        <p className="section-label">Member · {query.section}</p>
        <h1 id="workspace-title" tabIndex={-1}>
          {titles[query.section]}
        </h1>
      </header>
      <div className="workspace-record-picker search-field">
        <label htmlFor="member-example">
          View a fictional example or your application
        </label>
        <select
          id="member-example"
          value={record.id}
          disabled={!ready || pending}
          onChange={(event) => {
            dispatch({ type: "select", id: event.target.value });
            navigate({ record: event.target.value });
          }}
        >
          {state.records.map((item) => (
            <option key={item.id} value={item.id}>
              {item.profile.businessName} · {item.approval}
            </option>
          ))}
        </select>
      </div>
      {query.record && !requested && (
        <p role="status">
          That session record is unavailable after reset or refresh. Showing the
          selected example.
        </p>
      )}
      <div className="workspace-business">
        <h2 data-testid="selected-business">{profile.businessName}</h2>
        <p>
          {profile.city}, {profile.state}
        </p>
      </div>
      {query.section === "overview" && (
        <>
          <RecordStatus record={record} />
          <section className="workspace-next">
            <h2>Next steps</h2>
            <p>
              {record.suspended
                ? "This example is suspended. Profile edits cannot remove suspension; explore the admin listing view to review it."
                : record.approval === "pending"
                  ? "Your sample application is awaiting a demo review. You can check your details while it is pending."
                  : record.approval === "rejected"
                    ? "Review the decision below and refine your profile. Editing does not change the decision."
                    : record.subscription !== "active"
                      ? "Your sample application is approved, but its subscription is inactive. Membership here is read-only."
                      : "This example meets the listing rules. Review your profile and explore the fictional inquiry inbox."}
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
                <p>Demo decision reason: {record.decisionReason}</p>
              )}
              {record.suspensionReason && (
                <p>
                  Demo suspension / reinstatement reason:{" "}
                  {record.suspensionReason}
                </p>
              )}
            </section>
          )}
          <div className="workspace-shortcuts">
            <Link href={href({ section: "inquiries", record: record.id })}>
              <strong>{inbox.length} fictional inquiries</strong>
              <span>Explore the separately seeded inbox</span>
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
            <h2 id="edit-heading">Edit sample profile</h2>
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
            <summary>Public-profile preview</summary>
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
          <h2>Fictional inquiry inbox</h2>
          <p>
            Separately seeded examples; public demo inquiries are never
            delivered here.
          </p>
          {inbox.length ? (
            inbox.map((item) => (
              <details key={item.id}>
                <summary>{item.subject}</summary>
                <p>Fictional sender: {item.sender}</p>
                <p>{item.message}</p>
              </details>
            ))
          ) : (
            <div className="workspace-empty">
              <h3>No fictional messages for this example.</h3>
              <p>
                Choose Meadow Sample Studio to explore the seeded inbox. No real
                activity or delivery is represented.
              </p>
            </div>
          )}
        </section>
      )}
      {query.section === "membership" && (
        <section className="panel">
          <h2>Sample subscription</h2>
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
