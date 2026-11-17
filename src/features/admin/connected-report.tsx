import Link from "next/link";
import type { OperationsReport } from "@/domain/admin-operations";
export function ReportFilter({ month }: { month: string }) {
  return (
    <form method="get" action="/admin/reports" className="admin-inline-actions">
      <div className="search-field admin-month-filter">
        <label htmlFor="report-month">
          Application month ending the displayed range (UTC)
        </label>
        <input
          type="month"
          name="month"
          id="report-month"
          min="0001-01"
          max="9999-12"
          required
          defaultValue={month}
        />
      </div>
      <button type="submit" className="button">
        Load report
      </button>
    </form>
  );
}
export function ConnectedReport({ report: r }: { report: OperationsReport }) {
  const href = (page: number) =>
    `/admin/reports?${new URLSearchParams({ month: r.month, page: String(page) })}`;
  return (
    <div className="connected-operations admin-management-stack">
      <ReportFilter month={r.month} />
      <p>
        Current snapshot as of <time dateTime={r.asOf}>{r.asOf}</time>.
        Application, membership, category and featured states below are current,
        not historical trends.
      </p>
      <dl className="admin-stat-grid" aria-label="Operational totals">
        {[
          ["Total applications", r.total],
          ["Eligible public listings", r.eligible],
          ["Editorial selections (including hidden)", r.featured.selected],
          ["Visible editorial selections", r.featured.visibleEditorial],
          ["Recorded featured entitlements", r.featured.entitled],
          ["Visible entitlement listings", r.featured.visibleEntitled],
          ["Visible featured listings (unique)", r.featured.visible],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section className="panel">
        <h2>Current application status</h2>
        <dl className="admin-breakdown">
          {Object.entries(r.applicationStatuses).map(([status, count]) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
        <p>
          One saved application per listing, grouped by its current approval.
          Suspension is separate. Public eligibility requires approved + active
          membership + no suspension.
        </p>
      </section>
      <section className="panel">
        <h2>Current membership states</h2>
        <dl className="admin-breakdown">
          {Object.entries(r.membershipStates).map(([status, count]) => (
            <div key={status}>
              <dt>
                {status === "missing"
                  ? "Application listing without a membership record"
                  : status.replaceAll("_", " ")}
              </dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
        <p>
          Membership states count all saved membership rows. Missing counts
          application listings with no membership row; it is not a billing
          status. Active membership alone does not imply publication. Editorial
          selection never changes membership or entitlement.
        </p>
      </section>
      <section className="panel">
        <h2>Listings by category</h2>
        <p>
          Current assignments to application-backed listings. Each listing
          counts once per assigned category, including inactive categories.
          Multi-category listings overlap; category totals may exceed unique
          listing totals. Active counts membership status; eligible also
          requires approval and no suspension. No combined-category billing is
          inferred.
        </p>
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="Category counts"
          tabIndex={0}
        >
          <table className="admin-analytics-table">
            <caption>Current category membership and eligibility</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Listings</th>
                <th scope="col">Active</th>
                <th scope="col">Eligible</th>
              </tr>
            </thead>
            <tbody>
              {r.categories.map((c) => (
                <tr key={c.id}>
                  <th scope="row">
                    {c.name}
                    {!c.active ? " (inactive)" : ""}
                  </th>
                  <td>{c.total}</td>
                  <td>{c.activeMemberships}</td>
                  <td>{c.eligible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!r.categories.length && <p>No saved categories.</p>}
      </section>
      <section className="panel">
        <h2>Monthly application submissions (UTC)</h2>
        <p>
          Up to 12 calendar months ending {r.month}. Uses original application
          submitted_at, with inclusive month start and exclusive next-month
          start in UTC, regardless of current status. These are submission
          counts, not historical approvals, membership or directory growth
          snapshots. A zero means no saved submissions in that month.
        </p>
        <dl className="admin-breakdown">
          {r.months.map((m) => (
            <div key={m.month}>
              <dt>{m.month}</dt>
              <dd>{m.count}</dd>
            </div>
          ))}
        </dl>
        <p>
          Applications without a submission timestamp: {r.undated}; excluded
          from monthly counts.
        </p>
      </section>
      <section className="panel">
        <h2>Supporting applications</h2>
        <p>
          Page {r.page}. Newest submission first, then stable listing ID. At
          most 20 rows per page. Reload for current saved states.
        </p>
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="Supporting applications"
          tabIndex={0}
        >
          <table className="admin-analytics-table">
            <caption>Saved applications</caption>
            <thead>
              <tr>
                <th scope="col">Listing</th>
                <th scope="col">Submitted (UTC)</th>
                <th scope="col">Approval</th>
                <th scope="col">Membership</th>
                <th scope="col">Suspension</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    <Link href={`/admin/applications/${p.id}`}>
                      {p.businessName}
                    </Link>
                  </th>
                  <td>{p.submittedAt ?? "Unavailable"}</td>
                  <td>{p.approval}</td>
                  <td>{p.membership ?? "No record"}</td>
                  <td>{p.suspended ? "Suspended" : "No suspension"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!r.items.length && <p>No applications on this page.</p>}
        <nav
          className="admin-inline-actions"
          aria-label="Report application pages"
        >
          {r.page > 1 && (
            <Link className="text-link" href={href(r.page - 1)}>
              Previous page
            </Link>
          )}
          {r.page * 20 < r.total && (
            <Link className="text-link" href={href(r.page + 1)}>
              Next page
            </Link>
          )}
        </nav>
      </section>
      <section className="panel">
        <h2>Metric definitions and unavailable reporting</h2>
        <p>
          Editorial selections include saved selections currently hidden by
          ineligibility. Recorded entitlement counts are read only. Visible
          featured counts the union of eligible editorial selections and
          eligible recorded entitlements once per listing, so overlap is not
          added twice. Names and states are current saved values.
        </p>
        <p>
          Revenue, visitor traffic, conversions, historical membership trends
          and email-delivery metrics are unavailable. No tracking, payment or
          email-delivery service is connected by this report.
        </p>
      </section>
    </div>
  );
}
