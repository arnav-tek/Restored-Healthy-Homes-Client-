"use client";
import Link from "next/link";
import {
  FileText,
  List,
  Shield,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { filterDemoRecords, demoDashboardCounts } from "@/domain/demo-member";
import { isPubliclyEligible } from "@/domain/listing";
import { useDemoSession, useDemoDraft } from "@/features/member/demo-session";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";

export function RecordRegister({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state } = useDemoSession();
  const { query, href, navigate, pending } = useDashboardNavigation("admin");
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `filters:${query.section}`,
  );
  const ready = useDemoReady();
  const counts = demoDashboardCounts(state.records);
  const filtered = filterDemoRecords(state.records, {
    query: query.q,
    approval: query.status,
    suspension: query.suspension,
  });

  const approvedCount = state.records.filter(
    (r) => r.approval === "approved",
  ).length;
  const rejectedCount = state.records.filter(
    (r) => r.approval === "rejected",
  ).length;
  const totalClaims = state.records.reduce(
    (acc, r) => acc + r.credentials.length,
    0,
  );
  const totalVerified = state.records.reduce(
    (acc, r) =>
      acc +
      r.credentials.filter((c) => c.verification === "verified").length,
    0,
  );

  return (
    <section
      className="workspace-register"
      aria-label="Application register"
    >
      {/* Tab Specific Summary Metric Cards */}
      {query.section === "applications" && (
        <div className="tab-summary-grid">
          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-peach">
              <FileText size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{counts.pending}</span>
              <strong className="tab-summary-label">Pending applications</strong>
              <small className="tab-summary-sub">Awaiting admin decision</small>
            </div>
          </div>

          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-sage">
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{approvedCount}</span>
              <strong className="tab-summary-label">Approved applications</strong>
              <small className="tab-summary-sub">Meets review standards</small>
            </div>
          </div>

          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-neutral">
              <XCircle size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{rejectedCount}</span>
              <strong className="tab-summary-label">Rejected applications</strong>
              <small className="tab-summary-sub">Declined during review</small>
            </div>
          </div>
        </div>
      )}

      {query.section === "listings" && (
        <div className="tab-summary-grid">
          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-sage">
              <List size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{state.records.length}</span>
              <strong className="tab-summary-label">Total listings</strong>
              <small className="tab-summary-sub">Total session records</small>
            </div>
          </div>

          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-sage">
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{counts.eligible}</span>
              <strong className="tab-summary-label">Eligible listings</strong>
              <small className="tab-summary-sub">Active in public directory</small>
            </div>
          </div>

          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-peach">
              <Ban size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{counts.suspended}</span>
              <strong className="tab-summary-label">Suspended records</strong>
              <small className="tab-summary-sub">Hidden from visitors</small>
            </div>
          </div>
        </div>
      )}

      {query.section === "credentials" && (
        <div className="tab-summary-grid">
          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-peach">
              <Shield size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{counts.unverified}</span>
              <strong className="tab-summary-label">Unverified claims</strong>
              <small className="tab-summary-sub">Pending verification check</small>
            </div>
          </div>

          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-sage">
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{totalVerified}</span>
              <strong className="tab-summary-label">Verified claims</strong>
              <small className="tab-summary-sub">Confirmed by administrator</small>
            </div>
          </div>

          <div className="tab-summary-card">
            <div className="tab-summary-icon icon-neutral">
              <FileText size={18} aria-hidden="true" />
            </div>
            <div className="tab-summary-details">
              <span className="tab-summary-num">{totalClaims}</span>
              <strong className="tab-summary-label">Total claims</strong>
              <small className="tab-summary-sub">Across all professional profiles</small>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar Card */}
      <div className="admin-filter-card">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            const data = new FormData(event.currentTarget);
            clearDraft();
            navigate({
              q: String(data.get("q") ?? ""),
              status: String(data.get("status") ?? "all"),
              suspension: String(data.get("suspension") ?? "all"),
              record: "",
            });
          }}
        >
          <fieldset
            disabled={!ready || pending}
            className="admin-filters-grid"
            aria-busy={pending}
          >
            <legend className="sr-only">Filter records</legend>
            <div className="search-field">
              <label htmlFor="admin-search">Search applications</label>
              <input
                id="admin-search"
                name="q"
                value={String(draft?.q ?? query.q)}
                onChange={(event) =>
                  saveDraft({ ...draft, q: event.target.value })
                }
                maxLength={120}
                placeholder="Business, applicant or city"
              />
            </div>
            <div className="search-field">
              <label htmlFor="admin-status">Application status</label>
              <select
                id="admin-status"
                name="status"
                value={String(draft?.status ?? query.status)}
                onChange={(event) =>
                  saveDraft({ ...draft, status: event.target.value })
                }
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
                name="suspension"
                value={String(draft?.suspension ?? query.suspension)}
                onChange={(event) =>
                  saveDraft({ ...draft, suspension: event.target.value })
                }
              >
                <option value="all">All records</option>
                <option value="suspended">Suspended</option>
                <option value="clear">Not suspended</option>
              </select>
            </div>
            <div className="filter-actions-row">
              <Button type="submit" className="button-primary">
                Apply filters
              </Button>
              <Button
                type="button"
                className="button-secondary"
                onClick={() => {
                  clearDraft();
                  navigate({
                    q: "",
                    status: "all",
                    suspension: "all",
                    record: "",
                  });
                }}
              >
                Clear filters
              </Button>
            </div>
          </fieldset>
        </form>
      </div>

      <p role="status" className="result-count">
        {filtered.length} of {state.records.length} applications shown
      </p>

      {filtered.length ? (
        <div
          className="admin-table-card workspace-table"
          role="region"
          aria-label="Records"
          tabIndex={0}
        >
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                Records and their independent listing states. Open a business for {query.section}.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Category</th>
                  <th scope="col">Location</th>
                  <th scope="col">Application</th>
                  <th scope="col">Subscription</th>
                  <th scope="col">Listing</th>
                  <th scope="col" className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const categoriesText = catalog
                    .filter((item) =>
                      record.profile.categoryIds.includes(item.id),
                    )
                    .map((item) => item.name)
                    .join(" · ");

                  return (
                    <tr key={record.id}>
                      <th scope="row">
                        <Link
                          href={href({ record: record.id })}
                          className="table-business-link"
                        >
                          <span className="sr-only">Review </span>
                          <span className="table-business-title">
                            {record.profile.businessName}
                          </span>
                        </Link>
                        <small className="table-applicant-sub">
                          {record.profile.name}
                        </small>
                      </th>
                      <td>
                        <span className="table-category-label">
                          {categoriesText || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="table-location-text">
                          {record.profile.city}, {record.profile.state}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-badge badge-${record.approval}`}
                        >
                          {record.approval}
                        </span>
                      </td>
                      <td>
                        <span className="table-sub-status">
                          {record.subscription}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-badge badge-${
                            record.suspended
                              ? "suspended"
                              : isPubliclyEligible(record)
                                ? "eligible"
                                : "ineligible"
                          }`}
                        >
                          {record.suspended
                            ? "Suspended"
                            : isPubliclyEligible(record)
                              ? "Eligible"
                              : "Not eligible"}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          href={href({ record: record.id })}
                          className="table-action-link"
                        >
                          Review <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="workspace-empty">
          <h2>No applications match</h2>
          <p>
            Clear filters to see records and applications created in this tab.
          </p>
        </div>
      )}
    </section>
  );
}
