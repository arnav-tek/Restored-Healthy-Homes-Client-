"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  membershipStatuses,
  featuredDemoRecords,
} from "@/domain/admin-showcase";
import { isPubliclyEligible } from "@/domain/listing";
import type { DemoMemberRecord } from "@/domain/demo-member";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { RecordStatus } from "@/features/dashboard/record-status";
import { parseReviewReason } from "@/validation/admin";
import { Button } from "@/components/ui/button";

export function MembershipControls({
  record,
  featured = false,
}: {
  record: DemoMemberRecord;
  featured?: boolean;
}) {
  const { dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `${featured ? "featured" : "membership"}:${record.id}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const reason = useRef<HTMLTextAreaElement>(null);
  const prefix = featured ? "featured" : "membership";
  return (
    <section className="panel admin-scenario-panel">
      <p className="section-tag">Showcase controls</p>
      <h2>{featured ? "Featured placement" : "Membership scenario"}</h2>
      <p>
        {featured
          ? "Preview an entitlement and its eligibility. Final pricing, duration and search priority await client approval."
          : "Simulate payment states to demonstrate listing eligibility. No subscription is created and no money is collected."}
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          const data = new FormData(event.currentTarget);
          const note = parseReviewReason(data.get("reason"));
          if (!note) {
            setError("Enter a scenario note of 3–300 characters.");
            reason.current?.focus();
            return;
          }
          setError("");
          const status = membershipStatuses.find(
            (item) => item === data.get("status"),
          );
          const enabled = data.get("status") === "active";
          if (!featured && !status) return;
          if (
            !window.confirm(
              `Apply this ${featured ? "featured" : "membership"} scenario to ${record.profile.businessName}? This changes only this tab's showcase.`,
            )
          )
            return;
          if (featured)
            dispatch({
              type: "set-featured",
              id: record.id,
              enabled,
              reason: note,
            });
          else if (status)
            dispatch({
              type: "simulate-membership",
              id: record.id,
              status,
              reason: note,
            });
          clearDraft();
        }}
      >
        <fieldset className="member-form-fields" disabled={!ready}>
          <legend className="sr-only">
            {featured ? "Featured" : "Membership"} scenario for{" "}
            {record.profile.businessName}
          </legend>
          <div className="search-field">
            <label htmlFor={`${prefix}-status`}>
              {featured
                ? "Featured entitlement"
                : "Simulated membership status"}
            </label>
            <select
              id={`${prefix}-status`}
              name="status"
              value={String(
                draft?.status ??
                  (featured ? record.featuredEntitlement : record.subscription),
              )}
              onChange={(event) =>
                saveDraft({ ...draft, status: event.target.value })
              }
            >
              {featured ? (
                <>
                  <option value="none">No entitlement</option>
                  <option value="active">Active entitlement</option>
                </>
              ) : (
                membershipStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor={`${prefix}-reason`}>Scenario note</label>
            <textarea
              id={`${prefix}-reason`}
              ref={reason}
              name="reason"
              rows={2}
              maxLength={300}
              value={String(draft?.reason ?? "")}
              onChange={(event) =>
                saveDraft({ ...draft, reason: event.target.value })
              }
              aria-invalid={!!error}
              aria-describedby={`${prefix}-error`}
            />
            <p id={`${prefix}-error`} role="alert" className="field-error">
              {error}
            </p>
          </div>
          <Button type="submit">
            {featured ? "Apply featured scenario" : "Apply membership scenario"}
          </Button>
        </fieldset>
      </form>
      <p className="workspace-note">
        {isPubliclyEligible(record)
          ? "This record is eligible in the directory overview."
          : "This record is hidden from the directory overview. Approval, active membership and no suspension are all required."}{" "}
        {featured &&
        record.featuredEntitlement === "active" &&
        !isPubliclyEligible(record)
          ? "Its featured entitlement is retained but cannot display while ineligible."
          : ""}
      </p>
    </section>
  );
}

export function AdminMemberships({ featured = false }: { featured?: boolean }) {
  const { state, resetVersion } = useDemoSession();
  const { query, href } = useDashboardNavigation("admin");
  const record = state.records.find((item) => item.id === query.record);
  const placements = featuredDemoRecords(state.records);
  return (
    <div className="admin-management-stack">
      <div className="workspace-note">
        All controls on this page simulate a workflow in this tab. Refresh or
        reset clears changes. No billing records are created.
      </div>
      {query.record ? (
        <>
          <Link className="text-link" href={href({ record: "" })}>
            ← Back to {featured ? "featured listings" : "memberships"}
          </Link>
          {record ? (
            <div key={`${record.id}-${resetVersion}`}>
              <h2>{record.profile.businessName}</h2>
              <RecordStatus record={record} />
              <MembershipControls record={record} featured={featured} />
              <Link
                className="text-link"
                href={href({ section: "listings", record: record.id })}
              >
                Open listing and profile
              </Link>
            </div>
          ) : (
            <p className="workspace-empty">
              This session record is unavailable. Choose another record.
            </p>
          )}
        </>
      ) : (
        <div className="admin-management-grid">
          {state.records.map((item) => (
            <article key={item.id} className="panel admin-management-card">
              <span className="section-tag">
                {featured
                  ? item.featuredEntitlement === "active"
                    ? "Entitlement active"
                    : "No entitlement"
                  : item.subscription.replaceAll("_", " ")}
              </span>
              <h2>{item.profile.businessName}</h2>
              <p>
                {isPubliclyEligible(item)
                  ? "Eligible for directory preview"
                  : "Not eligible for directory preview"}
              </p>
              <Link href={href({ record: item.id })} className="text-link">
                Manage {item.profile.businessName}
              </Link>
            </article>
          ))}
        </div>
      )}
      {featured && (
        <section className="panel" data-testid="featured-placement-preview">
          <h2>Featured placement preview</h2>
          <p>
            Eligible featured examples, in stable session order. This does not
            change public search ranking.
          </p>
          {placements.length ? (
            <ol>
              {placements.map((item) => (
                <li key={item.id}>{item.profile.businessName}</li>
              ))}
            </ol>
          ) : (
            <p>
              No eligible featured listings. Enable an entitlement on an
              eligible record to preview placement.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
