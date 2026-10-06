"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { filterDemoRecords } from "@/domain/demo-member";
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
  const filtered = filterDemoRecords(state.records, {
    query: query.q,
    approval: query.status,
    suspension: query.suspension,
  });
  return (
    <section
      className="workspace-register"
      aria-label="Sample application register"
    >
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
          className="admin-filters"
          aria-busy={pending}
        >
          <legend className="sr-only">Filter demo records</legend>
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
          <div className="filter-actions">
            <Button type="submit">Apply filters</Button>
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
      <p role="status" className="result-count">
        {filtered.length} of {state.records.length} applications shown
      </p>
      {filtered.length ? (
        <div
          className="table-scroll workspace-table"
          role="region"
          aria-label="Demo records"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">
              Fictional records and their independent listing states. Open a
              business for {query.section}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Application</th>
                <th scope="col">Subscription</th>
                <th scope="col">Listing</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <th scope="row">
                    <Link href={href({ record: record.id })}>
                      <span className="sr-only">Review </span>
                      {record.profile.businessName}
                    </Link>
                    <small>
                      {catalog
                        .filter((item) =>
                          record.profile.categoryIds.includes(item.id),
                        )
                        .map((item) => item.name)
                        .join(" · ")}
                    </small>
                  </th>
                  <td>
                    <span
                      className={`status-badge ${record.approval === "approved" ? "visible" : ""}`}
                    >
                      {record.approval}
                    </span>
                  </td>
                  <td>{record.subscription}</td>
                  <td>
                    {record.suspended
                      ? "Suspended"
                      : isPubliclyEligible(record)
                        ? "Eligible"
                        : "Not eligible"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="workspace-empty">
          <h2>No applications match</h2>
          <p>
            Clear filters to see sample records and applications created in this
            tab.
          </p>
        </div>
      )}
    </section>
  );
}
