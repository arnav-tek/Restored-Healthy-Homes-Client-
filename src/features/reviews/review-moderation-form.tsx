"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import type { ModeratableReview } from "@/domain/review-session";
import {
  moderationNoteLimit,
  parseModerationNote,
} from "@/validation/qa-moderation";

export function ReviewModerationForm({
  review,
}: {
  review: ModeratableReview;
}) {
  const { dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `review-moderation:${review.id}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const rawNote = draft?.note ?? review.moderationNote;
    const note = parseModerationNote(rawNote);
    if (
      note === null ||
      typeof rawNote !== "string" ||
      rawNote.length > moderationNoteLimit
    ) {
      setError("Keep the internal note within 500 characters.");
      noteRef.current?.focus();
      return;
    }
    const button = (event.nativeEvent as SubmitEvent).submitter;
    if (
      !(button instanceof HTMLButtonElement) ||
      (button.value !== "published" && button.value !== "rejected")
    )
      return;
    const status = button.value;
    if (
      status === "rejected" &&
      review.status === "published" &&
      !window.confirm(
        "Remove this published fictional review from public and member display? Its rating contribution will also be removed in this tab.",
      )
    )
      return;
    dispatch({ type: "moderate-review", id: review.id, status, note });
    clearDraft();
    setError("");
    setFeedback(
      review.status === status && review.moderationNote === note
        ? `Already ${status}. No change to this demo review.`
        : `Demo review ${status}. This decision affects only this tab.`,
    );
    requestAnimationFrame(() => feedbackRef.current?.focus());
  }
  return (
    <form className="panel review-moderation" onSubmit={submit} noValidate>
      <h3>Review decision</h3>
      <fieldset disabled={!ready} className="member-form-fields">
        <legend className="sr-only">Moderate this fictional review</legend>
        <div className="search-field">
          <label htmlFor="review-internal-note">
            Internal review note (optional)
          </label>
          <textarea
            ref={noteRef}
            id="review-internal-note"
            rows={3}
            maxLength={moderationNoteLimit}
            value={String(draft?.note ?? review.moderationNote)}
            onChange={(event) => saveDraft({ note: event.target.value })}
            aria-invalid={!!error}
            aria-describedby="review-note-help review-note-error"
          />
          <p className="field-help" id="review-note-help">
            Up to 500 characters. Fictional information only. Notes are excluded
            from public, member and visitor confirmation views.
          </p>
          <p className="field-error" id="review-note-error">
            {error}
          </p>
        </div>
        <div className="filter-actions">
          <Button type="submit" value="published">
            Publish review
          </Button>
          <Button type="submit" value="rejected" className="button-secondary">
            Reject review
          </Button>
        </div>
      </fieldset>
      <p className="field-help">
        Republishing moves the review to the front using fictional publication
        metadata. Repeating the same decision keeps its order; a changed note is
        saved without reordering.
      </p>
      <p ref={feedbackRef} tabIndex={-1} role="status">
        {feedback}
      </p>
      <noscript>JavaScript is required. Demo decisions are disabled.</noscript>
    </form>
  );
}
