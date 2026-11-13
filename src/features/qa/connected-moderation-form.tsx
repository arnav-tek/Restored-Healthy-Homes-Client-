"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { qaActions, type QaAdminItem, type QaAction } from "@/domain/qa-admin";
import { parseReviewReason } from "@/validation/admin";
import { parseModerationNote } from "@/validation/qa-moderation";
import { isRecord } from "@/validation/member-account";
export function ConnectedModerationForm({
  item,
  compareHref,
}: {
  item: QaAdminItem;
  compareHref: string;
}) {
  const router = useRouter(),
    options = qaActions(item.status),
    [choice, setChoice] = useState<QaAction>(options[0]),
    [reason, setReason] = useState(""),
    [note, setNote] = useState(item.note),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const action = options.includes(choice) ? choice : options[0];
  const reasonRef = useRef<HTMLTextAreaElement>(null),
    noteRef = useRef<HTMLTextAreaElement>(null),
    feedback = useRef<HTMLParagraphElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const why = parseReviewReason(reason),
      memo = parseModerationNote(note);
    if (!why) {
      setError("Enter a reason of 3–300 characters.");
      reasonRef.current?.focus();
      return;
    }
    if (memo === null) {
      setError("Keep the private note within 500 characters.");
      noteRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: item.kind,
          id: item.id,
          version: item.version,
          parentVersion: item.kind === "answer" ? item.parentVersion : null,
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
            : "Decision could not be confirmed. Keep your draft and compare history.",
        );
      setReason("");
      setNotice(
        `Decision saved: ${String(raw.status)}. Email delivery remains disabled.`,
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
      className="panel min-w-0"
      noValidate
      onSubmit={submit}
      aria-busy={busy}
    >
      <h3>Review decision</h3>
      <fieldset
        disabled={busy}
        className="member-form-fields min-w-0"
        style={{ gridTemplateColumns: "minmax(0,1fr)" }}
      >
        <legend className="sr-only">Moderate this {item.kind}</legend>
        <p className="field-help">
          Restore returns content to pending review. Reviewed text stays
          read-only until restored. Restored answers rejoin the end of the
          moderation order. Hiding or rejecting a question removes all its
          answers from public view while retaining their individual review
          states.
        </p>
        {!item.canPublish &&
          item.status === "pending" &&
          item.kind === "answer" && (
            <p className="notice">
              Publication requires a published parent, an eligible original
              specialist and the earliest non-rejected response. Compare the
              answer queue before approving.
            </p>
          )}
        <div className="search-field">
          <label htmlFor="qa-decision-action">Decision</label>
          <select
            id="qa-decision-action"
            value={action}
            onChange={(e) => setChoice(e.target.value as QaAction)}
          >
            {options.map((a) => (
              <option key={a} value={a}>
                {a === "restore"
                  ? "Restore to pending review"
                  : a === "hide"
                    ? "Hide published content"
                    : a === "publish"
                      ? "Publish reviewed content"
                      : "Reject content"}
              </option>
            ))}
          </select>
        </div>
        <div className="search-field">
          <label htmlFor="qa-decision-reason">Decision reason</label>
          <textarea
            id="qa-decision-reason"
            ref={reasonRef}
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!error}
            aria-describedby="qa-decision-feedback"
          />
          <p className="field-help">
            Required, 3–300 characters. Stored in private administrator history.
          </p>
        </div>
        <div className="search-field">
          <label htmlFor="qa-internal-note">
            Private moderator note (optional)
          </label>
          <textarea
            id="qa-internal-note"
            ref={noteRef}
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby="qa-note-help"
          />
          <p id="qa-note-help" className="field-help">
            Up to 500 characters. Neither reasons nor moderator notes appear in
            member/public output.
          </p>
        </div>
        <Button type="submit">
          {busy ? "Saving…" : "Save moderation decision"}
        </Button>
      </fieldset>
      <p
        id="qa-decision-feedback"
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
            Compare current content and history in another tab
          </Link>{" "}
          before retrying.{" "}
          <Link href={compareHref}>
            Reload this record (discards this draft)
          </Link>
          .
        </p>
      )}
    </form>
  );
}
