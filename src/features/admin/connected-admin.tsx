"use client";
import Link from "next/link";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useState } from "react";
import type {
  AdminWorkspace,
  AdminApplication,
  AdminDecision,
} from "@/domain/admin-account";
import { parseReviewReason } from "@/validation/admin";
import { Button } from "@/components/ui/button";
function DecisionEditor({
  record,
  onSave,
  onReload,
}: {
  record: AdminApplication;
  onSave: (
    decision: AdminDecision,
    reason: string,
    notes: string,
  ) => Promise<boolean>;
  onReload: () => Promise<void>;
}) {
  const ready = useDemoReady();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState(record.internalNotes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      method="post"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending || !ready) return;
        const action = new FormData(e.currentTarget).get(
          "decision",
        ) as AdminDecision;
        if (!parseReviewReason(reason)) {
          setError("Enter a reason of 3–300 characters.");
          e.currentTarget
            .querySelector<HTMLTextAreaElement>('[name="reason"]')
            ?.focus();
          return;
        }
        setError("");
        setPending(true);
        try {
          if (await onSave(action, reason, notes)) setReason("");
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset
        className="member-form-fields admin-decision-fields"
        disabled={pending || !ready}
      >
        <legend>Review decision</legend>
        <div className="search-field">
          <label htmlFor="admin-decision">Action</label>
          <select id="admin-decision" name="decision">
            {record.approval !== "approved" && (
              <option value="approve">Approve application</option>
            )}
            {record.approval !== "rejected" && (
              <option value="reject">Reject application</option>
            )}
            {record.approval === "approved" && (
              <option value={record.suspended ? "reinstate" : "suspend"}>
                {record.suspended ? "Reinstate listing" : "Suspend listing"}
              </option>
            )}
          </select>
        </div>
        <div className="search-field">
          <label htmlFor="admin-reason">Member-facing reason</label>
          <textarea
            id="admin-reason"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            aria-invalid={!!error}
            aria-describedby="admin-reason-error"
          />
          <p id="admin-reason-error" role="alert" className="field-error">
            {error}
          </p>
        </div>
        <div className="search-field">
          <label htmlFor="admin-notes">Internal notes (admin only)</label>
          <textarea
            id="admin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            rows={3}
          />
        </div>
        <Button type="submit" className="button-primary">
          {pending ? "Saving decision…" : "Save decision"}
        </Button>
        <Button type="button" onClick={() => void onReload()}>
          Reload saved record; keep draft
        </Button>
      </fieldset>
      <noscript>
        <p>JavaScript is required to submit a decision securely.</p>
      </noscript>
      <p className="field-help">
        Approval does not activate membership, clear suspension or grant
        featured placement. No email is sent.
      </p>
    </form>
  );
}
export function ConnectedAdmin({
  initial,
  selectedId,
  section,
}: {
  initial: AdminWorkspace;
  selectedId?: string;
  section: string;
}) {
  const [workspace, setWorkspace] = useState(initial);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const record = workspace.applications.find((a) => a.id === selectedId);
  async function reload() {
    try {
      const r = await fetch("/api/admin/applications", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 401 || r.status === 403)
          window.location.replace("/admin");
        throw Error(data.error);
      }
      setWorkspace(data);
      setFailure("");
      setMessage(
        "Saved record reloaded. Review the updated details before submitting your retained draft.",
      );
    } catch {
      setFailure("Unable to reload the saved record.");
    }
  }
  async function save(decision: AdminDecision, reason: string, notes: string) {
    if (!record) return false;
    setMessage("");
    setFailure("");
    try {
      const r = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          version: record.version,
          decisionVersion: record.decisionVersion,
          decision,
          reason,
          notes,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 401 || r.status === 403)
          window.location.replace("/admin");
        setFailure(data.error || "Decision failed. Your draft is retained.");
        return false;
      }
      setWorkspace(data);
      setMessage(
        "Decision saved. Member and public status now reflect the saved decision.",
      );
      return true;
    } catch {
      setFailure("Decision failed. Your draft is retained.");
      return false;
    }
  }
  return (
    <>
      <p
        role={failure ? "alert" : "status"}
        className={failure ? "field-error" : "session-status"}
      >
        {failure || message}
      </p>
      <nav aria-label="Application management" className="account-navigation">
        <Link href="/admin/applications">Applications</Link>
        <Link href="/admin/listings">Listings</Link>
        <Link href="/directory">Public directory</Link>
        <Link href="/admin/notifications">Inquiry email jobs</Link>
        <Link href="/admin/credentials">Credential reviews</Link>
        <Link href="/admin/questions">Q&A moderation</Link>
        <Link href="/admin/reviews">Review moderation</Link>
        <Link href="/admin/consultations">Consultations</Link>
        <Link href="/admin/content">Content</Link>
        <Link href="/admin/featured">Featured listings</Link>
        <Link href="/admin/reports">Reports</Link>
        <Link href="/admin/categories">Categories</Link>
      </nav>
      {record ? (
        <>
          <header className="page-heading">
            <h2>{record.profile.businessName}</h2>
            <p>
              Application: <strong>{record.approval}</strong> · Membership:{" "}
              <strong>{record.membership}</strong> ·{" "}
              {record.suspended ? "Suspended" : "Not suspended"}
            </p>
          </header>
          <dl className="admin-details-grid">
            <div className="admin-detail-item">
              <dt>Application contact</dt>
              <dd>
                {record.profile.name} · {record.profile.email}
              </dd>
            </div>
            <div className="admin-detail-item">
              <dt>Location</dt>
              <dd>
                {record.profile.city}, {record.profile.state}
              </dd>
            </div>
            <div className="admin-detail-item admin-detail-wide">
              <dt>Categories</dt>
              <dd>
                {record.profile.categoryIds
                  .map(
                    (id) =>
                      workspace.catalog.find((c) => c.id === id)?.name ?? id,
                  )
                  .join(", ")}
              </dd>
            </div>
            <div className="admin-detail-item admin-detail-wide">
              <dt>Description</dt>
              <dd>{record.profile.description}</dd>
            </div>
            <div className="admin-detail-item admin-detail-wide">
              <dt>Healthy-home practices</dt>
              <dd>{record.profile.practices}</dd>
            </div>
            <div className="admin-detail-item admin-detail-wide">
              <dt>Services</dt>
              <dd>{record.profile.services.join(", ")}</dd>
            </div>
            <div className="admin-detail-item admin-detail-wide">
              <dt>Credentials</dt>
              <dd>
                {record.credentials
                  .map((c) => `${c.name} (${c.verification})`)
                  .join(", ") || "None submitted"}
              </dd>
            </div>
            <div className="admin-detail-item admin-detail-wide">
              <dt>Last application reason</dt>
              <dd>{record.decisionReason || "No decision yet"}</dd>
            </div>
            <div className="admin-detail-item admin-detail-wide">
              <dt>Last suspension / reinstatement reason</dt>
              <dd>{record.suspensionReason || "None"}</dd>
            </div>
          </dl>
          <DecisionEditor
            key={record.id}
            record={record}
            onSave={save}
            onReload={reload}
          />
          <section>
            <h2>Decision history</h2>
            {record.history.length ? (
              <ol>
                {record.history.map((h) => (
                  <li key={h.id}>
                    <strong>{h.action}</strong> ·{" "}
                    <time dateTime={h.decidedAt}>{h.decidedAt}</time>
                    <p>{h.reason}</p>
                    <p className="field-help">Actor: {h.actorId}</p>
                    {h.internalNotes && (
                      <p>Internal notes: {h.internalNotes}</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No decisions recorded yet.</p>
            )}
          </section>
        </>
      ) : (
        <>
          <h2>{section === "listings" ? "Listings" : "Applications"}</h2>
          {workspace.applications.length ? (
            <ul className="admin-record-list">
              {workspace.applications
                .filter(
                  (a) => section !== "listings" || a.approval === "approved",
                )
                .map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/${section}/${a.id}`}>
                      {a.profile.businessName}
                    </Link>
                    <p>
                      {a.approval} · {a.membership}
                      {a.suspended ? " · Suspended" : ""}
                    </p>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="workspace-empty">
              No applications have been submitted yet.
            </p>
          )}
          {section === "listings" &&
            !workspace.applications.some((a) => a.approval === "approved") && (
              <p>No approved listings yet. Review applications first.</p>
            )}
        </>
      )}
    </>
  );
}
