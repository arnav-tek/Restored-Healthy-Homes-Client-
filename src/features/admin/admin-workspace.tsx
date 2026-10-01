"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { demoPublicDirectory, filterDemoRecords } from "@/domain/demo-member";
import { isPubliclyEligible } from "@/domain/listing";
import { useDemoCatalog, useDemoSession } from "@/features/member/demo-session";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";
import { PublicPreviewContent } from "@/features/member/public-preview-content";
import { ApplicationReview } from "./application-review";
import { CategoryLabels } from "./category-labels";

export function AdminWorkspace({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state, dispatch } = useDemoSession();
  const sessionCatalog = useDemoCatalog(catalog);
  const ready = useDemoReady();
  const [query, setQuery] = useState("");
  const [approval, setApproval] = useState("all");
  const [suspension, setSuspension] = useState("all");
  const [resetVersion, setResetVersion] = useState(0);
  const filtered = filterDemoRecords(state.records, {
    query,
    approval,
    suspension,
  });
  const record = state.records.find((item) => item.id === state.selectedId)!;
  const publicRecords = demoPublicDirectory(state.records);
  function clearFilters() {
    setQuery("");
    setApproval("all");
    setSuspension("all");
  }
  return (
    <>
      <header className="dashboard-heading">
        <p className="section-label">Demo admin workspace</p>
        <h1>A clear view of your directory.</h1>
        <p>Review fictional applications and explore local decisions.</p>
      </header>
      <p>
        These pages are demonstrations, not authentication or account access.
        Use fictional information. Refresh, full-page navigation or reset
        discards every local change.
      </p>
      <div className="session-reset">
        <Button
          type="button"
          disabled={!ready}
          onClick={() => {
            dispatch({ type: "reset" });
            clearFilters();
            setResetVersion((value) => value + 1);
          }}
        >
          Reset demo session
        </Button>
      </div>
      <p role="status" className="session-status">
        {state.notice}
      </p>
      <noscript>
        <p>
          Enable JavaScript for local admin actions. Nothing can be submitted
          without it.
        </p>
      </noscript>
      <section
        className="panel admin-register"
        aria-labelledby="register-heading"
      >
        <h2 id="register-heading">Sample application register</h2>
        <fieldset disabled={!ready} className="admin-filters">
          <legend className="sr-only">Filter demo applications</legend>
          <div className="search-field">
            <label htmlFor="admin-search">Search applications</label>
            <input
              id="admin-search"
              value={query}
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Business, applicant or city"
            />
          </div>
          <div className="search-field">
            <label htmlFor="admin-status">Application status</label>
            <select
              id="admin-status"
              value={approval}
              onChange={(event) => setApproval(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="admin-suspension">Suspension filter</label>
            <select
              id="admin-suspension"
              value={suspension}
              onChange={(event) => setSuspension(event.target.value)}
            >
              <option value="all">All records</option>
              <option value="suspended">Suspended</option>
              <option value="clear">Not suspended</option>
            </select>
          </div>
          <Button type="button" onClick={clearFilters}>
            Clear filters
          </Button>
        </fieldset>
        <p role="status">
          {filtered.length} of {state.records.length} applications shown.{" "}
          {publicRecords.length} eligible for the session preview.
        </p>
        <div className="admin-records">
          {filtered.map((item) => (
            <article key={item.id} className="admin-record">
              <h3>{item.profile.businessName}</h3>
              <p>
                {sessionCatalog
                  .filter((category) =>
                    item.profile.categoryIds.includes(category.id),
                  )
                  .map((category) => category.name)
                  .join(" · ")}
              </p>
              <p>
                {item.approval} · Subscription {item.subscription} ·{" "}
                {item.suspended ? "Suspended" : "Not suspended"}
              </p>
              <p className="status-badge">
                {isPubliclyEligible(item)
                  ? "Eligible for session preview"
                  : "Not eligible for session preview"}
              </p>
              <Button
                type="button"
                disabled={!ready}
                aria-pressed={record.id === item.id}
                onClick={() => {
                  dispatch({ type: "select", id: item.id });
                  requestAnimationFrame(() =>
                    document.getElementById("review-heading")?.focus(),
                  );
                }}
              >
                Review {item.profile.businessName}
              </Button>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <p className="inbox-empty">
            No applications match. Clear filters to see the fictional examples
            and any application created in this tab.
          </p>
        )}
      </section>
      <ApplicationReview
        key={`${record.id}-${resetVersion}`}
        record={record}
        catalog={sessionCatalog}
      />
      <CategoryLabels key={resetVersion} catalog={sessionCatalog} />
      <section className="panel" aria-labelledby="session-directory-heading">
        <h2 id="session-directory-heading">Session-only directory preview</h2>
        <p>
          This separate preview shows only approved records with an active
          subscription and no suspension. Admin decisions do not update the
          public directory or publish real listings. All content and
          verification are fictional.
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
              <PublicPreviewContent
                profile={profile}
                catalog={sessionCatalog}
              />
            </article>
          ))}
        </div>
        {!publicRecords.length && (
          <p className="inbox-empty">
            No eligible listings. Approval alone is insufficient; sample
            subscriptions are read-only.
          </p>
        )}
      </section>
    </>
  );
}
