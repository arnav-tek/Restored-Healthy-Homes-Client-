"use client";
import { useState } from "react";
import { adminAnalytics } from "@/domain/admin-showcase";
import { useDemoSession } from "@/features/member/demo-session";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";

export function AdminAnalytics({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state } = useDemoSession();
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const data = adminAnalytics(state.records, month);
  return (
    <div className="admin-management-stack">
      <p className="workspace-note">
        Live counts from this tab’s records. Active membership is counted
        separately from public eligibility. Sample application dates are in
        October 2026; new applications use their submission date in UTC.
      </p>
      <div className="search-field admin-month-filter">
        <label htmlFor="analytics-month">Application month (UTC)</label>
        <input
          type="month"
          id="analytics-month"
          value={month}
          onChange={(event) => {
            if (/^\d{4}-\d{2}$/.test(event.target.value))
              setMonth(event.target.value);
          }}
        />
      </div>
      <dl className="admin-stat-grid" aria-label="Directory analytics">
        {[
          ["Total applications", data.total],
          ["Active memberships", data.active],
          ["Eligible listings", data.eligible],
          ["Applications in selected month", data.newApplications],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {data.undated > 0 && (
        <p>
          {data.undated} records have no submission date and are excluded from
          monthly counts.
        </p>
      )}
      <section className="panel">
        <h2>Membership status</h2>
        <dl className="admin-breakdown">
          {data.membership.map(({ status, count }) => (
            <div key={status}>
              <dt>{status.replaceAll("_", " ")}</dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel">
        <h2>Members by category</h2>
        <p>
          A multi-category member counts once in each associated category.
          Counts do not represent billing totals.
        </p>
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="Category membership counts"
          tabIndex={0}
        >
          <table className="admin-analytics-table">
            <caption className="sr-only">
              Category membership and eligibility
            </caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Records</th>
                <th scope="col">Active</th>
                <th scope="col">Eligible</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => {
                const counts = data.byCategory(item.id);
                return (
                  <tr key={item.id}>
                    <th scope="row">{item.name}</th>
                    <td>{counts.total}</td>
                    <td>{counts.active}</td>
                    <td>{counts.eligible}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
