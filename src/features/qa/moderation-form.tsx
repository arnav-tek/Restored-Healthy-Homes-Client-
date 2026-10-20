"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import { canPublishSessionAnswer } from "@/domain/qa-session";
import type { ModerationStatus } from "@/domain/qa";
import {
  moderationNoteLimit,
  parseModerationNote,
} from "@/validation/qa-moderation";
export function QaModerationForm({
  kind,
  id,
  title,
  status,
  note,
}: {
  kind: "question" | "answer";
  id: string;
  title: string;
  status: ModerationStatus;
  note: string;
}) {
  const { state, dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `qa-review:${kind}:${id}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const parsed = parseModerationNote(draft?.note ?? note);
    if (parsed === null) {
      setError("Keep the internal note within 500 characters.");
      noteRef.current?.focus();
      return;
    }
    const button = (event.nativeEvent as SubmitEvent).submitter;
    if (
      !(button instanceof HTMLButtonElement) ||
      !["published", "rejected"].includes(button.value)
    )
      return;
    const next = button.value === "published" ? "published" : "rejected";
    const sessionAnswer = state.qa.answers.find((answer) => answer.id === id);
    if (
      kind === "answer" &&
      next === "published" &&
      sessionAnswer &&
      !canPublishSessionAnswer(state, id)
    ) {
      setError(
        "The first eligible response must be reviewed first. Reject it if unsuitable before publishing a later response.",
      );
      return;
    }
    if (
      next === "rejected" &&
      status === "published" &&
      !window.confirm(
        `Hide this published ${kind}: ${title}? ${kind === "question" ? "Its answers will also disappear from public view, without changing their individual statuses." : "It will disappear from public view."}`,
      )
    )
      return;
    dispatch({
      type: kind === "question" ? "moderate-question" : "moderate-answer",
      id,
      status: next,
      note: parsed,
    });
    clearDraft();
    setError("");
    setFeedback(
      `${kind === "question" ? "Question" : "Answer"} ${next}. This decision affects only this tab.`,
    );
    requestAnimationFrame(() => feedbackRef.current?.focus());
  }
  return (
    <form className="panel" noValidate onSubmit={submit}>
      <h3>Review decision</h3>
      <fieldset disabled={!ready} className="member-form-fields">
        <legend className="sr-only">Moderate this {kind}</legend>
        <div className="search-field">
          <label htmlFor="qa-internal-note">
            Internal moderation note (optional)
          </label>
          <textarea
            ref={noteRef}
            id="qa-internal-note"
            rows={3}
            maxLength={moderationNoteLimit}
            value={String(draft?.note ?? note)}
            onChange={(event) => saveDraft({ note: event.target.value })}
            aria-invalid={!!error}
            aria-describedby="qa-note-help qa-note-error"
          />
          <p id="qa-note-help" className="field-help">
            Up to 500 characters. Internal notes are excluded from public views
            and member answer history.
          </p>
          <p id="qa-note-error" className="field-error">
            {error}
          </p>
        </div>
        <div className="filter-actions">
          <Button type="submit" value="published">
            Publish {kind}
          </Button>
          <Button type="submit" value="rejected" className="button-secondary">
            Reject {kind}
          </Button>
        </div>
      </fieldset>
      <p ref={feedbackRef} tabIndex={-1} role="status">
        {feedback}
      </p>
      <noscript>Enable JavaScript to review submissions.</noscript>
    </form>
  );
}
