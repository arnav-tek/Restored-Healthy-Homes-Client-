"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SavedReview } from "@/domain/connected-reviews";
import { qaActions, type QaAction } from "@/domain/qa-admin";
import { parseReviewReason } from "@/validation/admin";
import { parseModerationNote } from "@/validation/qa-moderation";
import { isRecord } from "@/validation/member-account";
export function ConnectedReviewModeration({
  review,
  compareHref,
}: {
  review: SavedReview;
  compareHref: string;
}) {
  const router = useRouter(),
    options: QaAction[] =
      review.status === "published"
        ? ["publish", "hide", "reject"]
        : qaActions(review.status),
    [choice, setChoice] = useState<QaAction>(options[0]),
    [reason, setReason] = useState(""),
    [note, setNote] = useState(review.note),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const action = options.includes(choice) ? choice : options[0],
    input = useRef<HTMLTextAreaElement>(null),
    feedback = useRef<HTMLParagraphElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const why = parseReviewReason(reason),
      memo = parseModerationNote(note);
    if (!why || memo === null) {
      setError(
        "Use a reason of 3–300 characters and a private note of up to 500 characters.",
      );
      input.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: review.id,
          version: review.version,
          action,
          reason: why,
          note: memo,
        }),
      });
      const raw: unknown = await r.json();
      if (!r.ok || !isRecord(raw) || raw.saved !== true)
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Decision could not be confirmed; keep your draft and compare history.",
        );
      setReason("");
      setNotice(
        raw.unchanged === true
          ? "Review and private note are already saved; no change was made."
          : `Review decision saved: ${String(raw.status)}. Refresh public pages to see the accepted rating. No email was sent.`,
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Decision could not be confirmed. Your draft is retained.",
      );
    } finally {
      setBusy(false);
      requestAnimationFrame(() => feedback.current?.focus());
    }
  }
  return (
    <form
      className="panel review-moderation min-w-0"
      noValidate
      onSubmit={submit}
      aria-busy={busy}
    >
      <h3>Review decision</h3>
      <fieldset
        className="member-form-fields min-w-0"
        disabled={busy}
        style={{ gridTemplateColumns: "minmax(0,1fr)" }}
      >
        <legend className="sr-only">Moderate this review</legend>
        <p className="field-help">
          Scores and customer text cannot be changed here. Restore returns a
          review to pending; publish requires another explicit decision and an
          eligible listing. Republishing updates its publication order.
          Moderation does not verify a customer or purchase.
        </p>
        {!review.eligible && (
          <p className="notice">
            This listing is unavailable publicly. Its reviews do not contribute
            to any public rating, and publication is blocked.
          </p>
        )}
        <div className="search-field">
          <label htmlFor="review-action">Decision</label>
          <select
            id="review-action"
            value={action}
            onChange={(e) => setChoice(e.target.value as QaAction)}
          >
            {options.map((a) => (
              <option key={a} value={a}>
                {a === "restore"
                  ? "Restore to pending review"
                  : a === "publish"
                    ? review.status === "published"
                      ? "Save published review note"
                      : "Publish review"
                    : a === "hide"
                      ? "Hide published review"
                      : "Reject review"}
              </option>
            ))}
          </select>
        </div>
        <div className="search-field">
          <label htmlFor="review-reason">Private decision reason</label>
          <textarea
            ref={input}
            id="review-reason"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!error}
            aria-describedby="review-moderation-feedback"
          />
        </div>
        <div className="search-field">
          <label htmlFor="review-internal-note">
            Internal review note (optional)
          </label>
          <textarea
            id="review-internal-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby="review-note-help"
          />
          <p className="field-help" id="review-note-help">
            Notes and reasons stay private to authorized administrators.
          </p>
        </div>
        <Button type="submit">
          {busy ? "Saving…" : "Save review decision"}
        </Button>
      </fieldset>
      <p
        id="review-moderation-feedback"
        ref={feedback}
        tabIndex={-1}
        role={error ? "alert" : "status"}
        className={error ? "field-error" : "field-help"}
      >
        {error || notice}
      </p>
      {error && (
        <p>
          Your reason and note are retained.{" "}
          <Link href={compareHref} target="_blank" rel="noopener">
            Compare saved review and history in another tab
          </Link>
          , or{" "}
          <Link href={compareHref}>reload this review (discards draft)</Link>.
        </p>
      )}
    </form>
  );
}
