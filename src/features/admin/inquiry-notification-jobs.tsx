"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  notificationStateLabels,
  type NotificationJob,
  type NotificationJobs,
} from "@/domain/inquiry-notification";
import { isRecord } from "@/validation/member-account";
import { parseReviewReason } from "@/validation/admin";
import { parseNotificationJobs } from "@/validation/inquiry-notifications";
import { inquiryDate } from "@/features/member/inquiry-date";

function RetryJob({
  job,
  onQueued,
}: {
  job: NotificationJob;
  onQueued: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!parseReviewReason(reason)) {
      setFailure("Enter a reason of 3–300 characters.");
      event.currentTarget.querySelector("input")?.focus();
      return;
    }
    setPending(true);
    setFailure("");
    try {
      const response = await fetch("/api/admin/inquiry-notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: job.id, version: job.version, reason }),
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || result.queued !== true) {
        setFailure(
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Retry could not be confirmed. Reload before trying again.",
        );
        return;
      }
      setReason("");
      await onQueued();
    } catch {
      setFailure("Retry could not be confirmed. Reload the current job state.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate aria-busy={pending}>
      <fieldset disabled={pending} className="member-form-fields">
        <legend>Retry this failed job</legend>
        <p className="field-help">
          Up to two manual retries within 24 hours. Unknown outcomes require
          reconciliation first.
        </p>
        <div className="search-field">
          <label htmlFor={`reason-${job.id}`}>Reason for retry</label>
          <input
            id={`reason-${job.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            required
            aria-invalid={!!failure}
            aria-describedby={`error-${job.id}`}
          />
        </div>
        <p id={`error-${job.id}`} className="field-error" role="alert">
          {failure}
        </p>
        <Button type="submit">
          {pending ? "Queueing retry…" : "Queue retry"}
        </Button>
      </fieldset>
    </form>
  );
}
export function InquiryNotificationJobs({
  initial,
}: {
  initial: NotificationJobs;
}) {
  const [jobs, setJobs] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  async function reload() {
    setLoading(true);
    setFailure("");
    try {
      const response = await fetch(
        `/api/admin/inquiry-notifications?page=${jobs.page}`,
        { cache: "no-store" },
      );
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || !Array.isArray(result.jobs)) {
        setFailure(
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Job status could not be refreshed.",
        );
        return;
      }
      const parsed = parseNotificationJobs(result);
      if (!parsed) {
        setFailure("Job status could not be verified.");
        return;
      }
      setJobs(parsed);
    } catch {
      setFailure(
        "Job status could not be refreshed. The previous list is still shown.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <p className="notice">
        Real email sending is disabled pending an approved provider, verified
        sender and scheduler. Saved inquiries remain available in member
        inboxes.
      </p>
      <div className="admin-inline-actions">
        <Link className="text-link" href="/admin/applications">
          Application management
        </Link>
        <Button type="button" onClick={reload} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh jobs"}
        </Button>
      </div>
      {failure && (
        <p className="field-error" role="alert">
          {failure}
        </p>
      )}
      <p role="status">{notice}</p>
      {jobs.jobs.length ? (
        <div className="grid gap-5 mt-6">
          {jobs.jobs.map((job) => (
            <article
              key={`${job.id}-${job.version}`}
              className="connected-inbox-card min-w-0 [overflow-wrap:anywhere]"
            >
              <h2 className="text-xl">{notificationStateLabels[job.state]}</h2>
              <p className="field-help">Job {job.id}</p>
              <p className="field-help">Inquiry reference {job.inquiryId}</p>
              <dl className="grid gap-3 sm:grid-cols-2 mt-4">
                <div>
                  <dt>Created</dt>
                  <dd>
                    <time dateTime={job.createdAt}>
                      {inquiryDate(job.createdAt)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>Attempts</dt>
                  <dd>
                    {job.attempts} · {job.manualRetries} manual retries
                  </dd>
                </div>
                {job.state === "retry" && (
                  <div>
                    <dt>Next retry</dt>
                    <dd>{inquiryDate(job.nextAttemptAt)}</dd>
                  </div>
                )}
                {job.failureCode && (
                  <div>
                    <dt>Last result</dt>
                    <dd>{job.failureCode.replaceAll("_", " ")}</dd>
                  </div>
                )}
                {job.acceptedAt && (
                  <div>
                    <dt>Provider acceptance</dt>
                    <dd>
                      {inquiryDate(job.acceptedAt)} · mailbox delivery
                      unconfirmed
                    </dd>
                  </div>
                )}
              </dl>
              {job.state === "failed" && job.manualRetries < 2 ? (
                <RetryJob
                  job={job}
                  onQueued={async () => {
                    setNotice(
                      "Retry queued. This does not confirm email delivery.",
                    );
                    await reload();
                  }}
                />
              ) : job.state === "unknown" ? (
                <p className="field-help">
                  Inspect the provider record before any further action. This
                  page does not resend an uncertain notification.
                </p>
              ) : null}
              {job.events.length > 0 && (
                <details className="mt-4">
                  <summary>Attempt history</summary>
                  <ol className="grid gap-3 mt-3">
                    {job.events.map((event, index) => (
                      <li key={`${event.at}-${index}`}>
                        {event.event.replaceAll("_", " ")} · attempt{" "}
                        {event.attempt} · {inquiryDate(event.at)}
                        {event.code && <p>{event.code.replaceAll("_", " ")}</p>}
                        {event.reason && <p>{event.reason}</p>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-empty">
          <h2>No notification jobs yet</h2>
          <p>
            New accepted inquiries create a job automatically. Historical
            inquiries are not emailed retroactively.
          </p>
        </div>
      )}
      <nav
        className="flex flex-wrap gap-4 mt-6"
        aria-label="Notification job pages"
      >
        {jobs.page > 1 && (
          <Link
            className="text-link"
            href={`/admin/notifications?page=${jobs.page - 1}`}
            prefetch={false}
          >
            Previous page
          </Link>
        )}
        <span>Page {jobs.page}</span>
        {jobs.hasNext && (
          <Link
            className="text-link"
            href={`/admin/notifications?page=${jobs.page + 1}`}
            prefetch={false}
          >
            Next page
          </Link>
        )}
      </nav>
    </>
  );
}
