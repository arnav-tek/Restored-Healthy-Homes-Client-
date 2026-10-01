"use client";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { formatMonthlyPrice } from "@/domain/categories";
import {
  memberEligibilityMessage,
  memberFormFields,
  projectDemoPublic,
} from "@/domain/demo-member";
import { PublicPreviewContent } from "./public-preview-content";
import { isPubliclyEligible } from "@/domain/listing";
import {
  ProfileFieldsForm,
  type ApplicationCategory,
} from "./profile-fields-form";
import { useDemoSession, useDemoCatalog } from "./demo-session";

export function MemberWorkspace({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state, dispatch } = useDemoSession();
  const sessionCatalog = useDemoCatalog(catalog);
  const ready = useDemoReady();
  const status = useRef<HTMLParagraphElement>(null);
  const record = state.records.find((item) => item.id === state.selectedId)!;
  const profile = record.profile;
  const selectedCategories = sessionCatalog.filter((category) =>
    profile.categoryIds.includes(category.id),
  );
  const inbox = state.inquiries.filter((item) => item.memberId === record.id);
  return (
    <>
      <header className="dashboard-heading">
        <p className="section-label">Demo member workspace</p>
        <h1>Your business, in preview.</h1>
        <p>
          Explore fictional examples or edit your application locally. No
          sign-in is required.
        </p>
      </header>
      <div className="member-session-controls">
        <div className="search-field">
          <label htmlFor="member-example">
            View a fictional example or your application
          </label>
          <select
            id="member-example"
            value={state.selectedId}
            disabled={!ready}
            onChange={(event) =>
              dispatch({ type: "select", id: event.target.value })
            }
          >
            {state.records.map((item) => (
              <option key={item.id} value={item.id}>
                {item.exampleLabel}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          disabled={!ready}
          onClick={() => dispatch({ type: "reset" })}
        >
          Reset demo session
        </Button>
      </div>
      <p className="field-help">
        Examples are separate records, not account access or status controls.
        Refresh or reset clears all local changes.
      </p>
      <p ref={status} role="status" tabIndex={-1} className="session-status">
        {state.notice}
      </p>
      <noscript>
        <p>
          Enable JavaScript to edit or switch examples. Nothing can be submitted
          without it.
        </p>
      </noscript>
      <section
        className="panel member-status-panel"
        aria-labelledby="member-status-heading"
      >
        <h2 id="member-status-heading">Application &amp; listing status</h2>
        <dl className="status-list">
          <div>
            <dt>Application</dt>
            <dd data-testid="member-approval">{record.approval}</dd>
          </div>
          <div>
            <dt>Subscription</dt>
            <dd>{record.subscription} (sample)</dd>
          </div>
          <div>
            <dt>Suspension</dt>
            <dd>{record.suspended ? "Suspended" : "None"}</dd>
          </div>
          <div>
            <dt>Eligibility</dt>
            <dd>
              {isPubliclyEligible(record)
                ? "Meets sample eligibility rules"
                : "Not eligible"}
            </dd>
          </div>
        </dl>
        <p>
          {record.approval === "pending"
            ? "Pending means awaiting review in this demonstration. No owner has received or reviewed your application."
            : record.approval === "rejected"
              ? "This is a fictional rejected example. You may edit its local preview; edits do not change the review decision."
              : "This example has an approved review state. Approval alone does not make a listing public."}
        </p>
        <p>{memberEligibilityMessage(record)}</p>
        {record.decisionReason && (
          <p>Demo decision reason: {record.decisionReason}</p>
        )}
        {record.suspensionReason && (
          <p>
            Demo suspension / reinstatement reason: {record.suspensionReason}
          </p>
        )}
      </section>
      <details className="panel member-editor" key={record.id}>
        <summary>Edit sample profile</summary>
        <p>
          Changes update this local preview only. Review decisions,
          subscription, suspension, verification, featured status and record
          identity cannot be edited here.
        </p>
        <ProfileFieldsForm
          key={`${record.id}-${state.revision}`}
          catalog={sessionCatalog}
          initial={memberFormFields(record)}
          submitLabel="Update local preview"
          onValid={(next) => {
            dispatch({ type: "edit", id: record.id, profile: next });
            requestAnimationFrame(() => status.current?.focus());
          }}
        />
      </details>
      <section
        className="panel member-public-preview"
        aria-labelledby="member-preview-heading"
      >
        <h2 id="member-preview-heading">Public-profile preview</h2>
        <p className="inquiry-notice">
          Local sample content only. This does not publish an application or
          update the public directory.
        </p>
        <PublicPreviewContent
          profile={projectDemoPublic(record)}
          catalog={sessionCatalog}
        />
        <p className="field-help">
          Your application contact name and email are not included in this
          public-facing preview.
        </p>
      </section>
      <section
        className="panel"
        id="membership"
        aria-labelledby="member-subscription-heading"
      >
        <h2 id="member-subscription-heading">Sample subscription</h2>
        <p>
          Read-only status: <strong>{record.subscription}</strong>. No payment,
          checkout or membership changes are available.
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
          Confirmed individual-category prices in USD. Multi-category pricing is
          pending confirmation; no combined total is calculated.
        </p>
      </section>
      <section
        className="panel member-inbox"
        aria-labelledby="member-inbox-heading"
      >
        <h2 id="member-inbox-heading">Fictional inquiry inbox</h2>
        <p>
          These messages are separate sample records. Demo inquiries from public
          profiles are never delivered here.
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
          <p className="inbox-empty">
            No fictional messages for this example. Try the approved example to
            explore the seeded inbox.
          </p>
        )}
      </section>
      <Link className="text-link" href="/list-your-business">
        Try the public application
      </Link>
    </>
  );
}
