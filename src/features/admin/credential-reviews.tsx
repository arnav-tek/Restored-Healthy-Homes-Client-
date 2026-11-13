"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type {
  AdminCredentials,
  AdminCredential,
  CredentialDecision,
} from "@/domain/credential-review";
import { parseAdminCredentials } from "@/validation/credential-review";
import { parseReviewReason } from "@/validation/admin";
import { isRecord } from "@/validation/member-account";
import { inquiryDate } from "@/features/member/inquiry-date";
function ReviewEditor({
  claim,
  onSaved,
}: {
  claim: AdminCredential;
  onSaved: () => Promise<void>;
}) {
  const options: CredentialDecision["action"][] = claim.archived
    ? []
    : claim.state === "verified"
      ? ["revoke"]
      : claim.state === "pending"
        ? claim.evidenceId
          ? ["verify", "reject"]
          : ["reject"]
        : claim.evidenceId
          ? ["verify"]
          : [];
  const [action, setAction] = useState<CredentialDecision["action"]>(
      options[0] ?? "verify",
    ),
    [reason, setReason] = useState(""),
    [pending, setPending] = useState(false),
    [failure, setFailure] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = parseReviewReason(reason);
    if (!parsed) {
      setFailure("Enter a reason of 3–300 characters.");
      input.current?.focus();
      return;
    }
    setPending(true);
    setFailure("");
    try {
      const r = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          version: claim.version,
          evidenceId: claim.evidenceId,
          action,
          reason: parsed,
        }),
      });
      const raw: unknown = await r.json();
      if (!r.ok || !isRecord(raw) || raw.saved !== true)
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Review could not be confirmed. Reload history before retrying.",
        );
      await onSaved();
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "Review could not be confirmed.",
      );
    } finally {
      setPending(false);
    }
  }
  return options.length ? (
    <form noValidate onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending} className="member-form-fields">
        <legend>Review this saved claim and evidence</legend>
        <p className="field-help">
          Decisions apply only to this claim version and current scan. Use the
          client’s agreed review criteria; uploading is not proof of
          authenticity. No expiry rule is configured.
        </p>
        <div className="search-field">
          <label htmlFor={`credential-action-${claim.id}`}>Decision</label>
          <select
            id={`credential-action-${claim.id}`}
            value={action}
            onChange={(e) =>
              setAction(e.target.value as CredentialDecision["action"])
            }
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o === "verify"
                  ? "Verify reviewed claim"
                  : o === "reject"
                    ? "Reject submitted claim"
                    : "Revoke reviewed claim"}
              </option>
            ))}
          </select>
        </div>
        <div className="search-field">
          <label htmlFor={`credential-reason-${claim.id}`}>
            Private review reason
          </label>
          <textarea
            ref={input}
            id={`credential-reason-${claim.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            aria-invalid={!!failure}
            aria-describedby={`credential-error-${claim.id}`}
          />
          <p
            id={`credential-error-${claim.id}`}
            role="alert"
            className="field-error"
          >
            {failure}
          </p>
        </div>
        <button type="submit" className="button">
          {pending ? "Saving…" : "Save credential decision"}
        </button>
      </fieldset>
      {failure && (
        <Link href="/admin/credentials" target="_blank" rel="noopener">
          Compare the latest credential history in another tab
        </Link>
      )}
    </form>
  ) : (
    <p className="field-help">
      {claim.archived
        ? "Archived claim: history and evidence are retained. New decisions are not permitted."
        : "A current evidence scan is required before verification."}
    </p>
  );
}
export function CredentialReviews({ initial }: { initial: AdminCredentials }) {
  const [data, setData] = useState(initial),
    [failure, setFailure] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setFailure("");
    try {
      const r = await fetch(`/api/admin/credentials?page=${data.page}`, {
        cache: "no-store",
      });
      const raw: unknown = await r.json(),
        parsed = r.ok ? parseAdminCredentials(raw) : null;
      if (!parsed)
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Credential reviews could not be loaded.",
        );
      setData(parsed);
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "Review history unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <nav
        className="admin-inline-actions"
        aria-label="Credential review navigation"
      >
        <Link href="/admin/applications">Application management</Link>
        <button
          type="button"
          className="text-link"
          onClick={load}
          disabled={busy}
        >
          {busy ? "Loading…" : "Reload credential reviews"}
        </button>
      </nav>
      <p className="notice">
        Private evidence scans are available only to their current owner and
        authorized administrators. Review decisions are independent of listing
        approval, membership and featured placement. Evidence is never
        published.
      </p>
      {failure && (
        <p role="alert" className="field-error">
          {failure}
        </p>
      )}
      <p role="status">{notice}</p>
      {data.claims.length ? (
        <div className="grid gap-5">
          {data.claims.map((c) => (
            <article
              key={`${c.id}-${c.version}`}
              className="panel min-w-0 [overflow-wrap:anywhere]"
            >
              <h2>{c.name}</h2>
              <p>
                {c.businessName} · {c.archived ? "Archived claim" : c.state} ·
                Version {c.version}
              </p>
              {c.evidenceId ? (
                <p>
                  <a
                    className="text-link"
                    href={`/api/admin/credentials?file=${c.evidenceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open current private evidence scan (new tab)
                  </a>
                </p>
              ) : (
                <p>No current evidence scan.</p>
              )}
              <ReviewEditor
                claim={c}
                onSaved={async () => {
                  setNotice(
                    "Credential decision saved. Refresh public/member pages to see the saved badge state. No email was sent.",
                  );
                  await load();
                }}
              />
              <details className="mt-4">
                <summary>Private review history ({c.history.length})</summary>
                {c.history.length ? (
                  <ol className="grid gap-3 mt-3">
                    {c.history.map((h) => (
                      <li key={h.version}>
                        <strong>
                          {h.action.replaceAll("_", " ")} · Version {h.version}
                        </strong>
                        <p>
                          {inquiryDate(h.at)} · Reviewer/actor{" "}
                          {h.actorId ?? "Internal change"}
                        </p>
                        <p>
                          {h.claimName} · {h.previousState} → {h.nextState}
                        </p>
                        <p>{h.reason}</p>
                        {h.evidenceId && (
                          <a
                            className="text-link"
                            href={`/api/admin/credentials?file=${h.evidenceId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open retained private evidence for this event
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>
                    No recorded review events. Legacy flags do not imply a newly
                    recorded review.
                  </p>
                )}
              </details>
            </article>
          ))}
        </div>
      ) : (
        <p className="workspace-empty">No credential claims are saved yet.</p>
      )}
      <nav
        className="admin-inline-actions"
        aria-label="Credential review pages"
      >
        {data.page > 1 && (
          <Link href={`/admin/credentials?page=${data.page - 1}`}>
            Previous page
          </Link>
        )}
        <span>Page {data.page}</span>
        {data.hasNext && (
          <Link href={`/admin/credentials?page=${data.page + 1}`}>
            Next page
          </Link>
        )}
      </nav>
    </>
  );
}
