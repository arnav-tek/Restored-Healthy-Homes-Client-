"use client";
import { useRef, useState } from "react";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { Button } from "@/components/ui/button";
import { parseAnswer, answerLimits } from "@/validation/qa-moderation";
import { answerSubmissionError } from "@/domain/qa-session";
export function AnswerForm({
  memberId,
  questionId,
  disabled,
}: {
  memberId: string;
  questionId: string;
  disabled: boolean;
}) {
  const { state, dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `answer:${memberId}:${questionId}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const blocked = answerSubmissionError(state, questionId);
  return (
    <section className="panel">
      <h2>Your answer</h2>
      <p>
        Share clear service information. Avoid personal medical details or clinical advice. Answers are reviewed before publication.
      </p>
      {blocked && <p className="workspace-empty">{blocked}</p>}
      {!blocked && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready || disabled || state.selectedId !== memberId) return;
            const body = parseAnswer(
              new FormData(event.currentTarget).get("body"),
            );
            const problem = answerSubmissionError(state, questionId);
            if (!body || problem) {
              setError(problem ?? "Use 20–3,000 characters for your answer.");
              input.current?.focus();
              return;
            }
            dispatch({ type: "submit-answer", questionId, body });
            clearDraft();
            setError("");
            setFeedback(
              "Answer submitted as pending in this tab. It is not public and no message was sent.",
            );
            requestAnimationFrame(() => status.current?.focus());
          }}
        >
          <fieldset
            disabled={!ready || disabled}
            className="member-form-fields"
          >
            <legend className="sr-only">Draft an answer</legend>
            <div className="search-field">
              <label htmlFor="qa-answer-body">Answer text</label>
              <textarea
                id="qa-answer-body"
                name="body"
                ref={input}
                value={String(draft?.body ?? "")}
                onChange={(event) => saveDraft({ body: event.target.value })}
                rows={6}
                maxLength={answerLimits.max}
                aria-invalid={!!error}
                aria-describedby="qa-answer-help qa-answer-error"
              />
              <p className="field-help" id="qa-answer-help">
                20–3,000 characters. Drafts are kept per member and question
                until submission or reset.
              </p>
              <p className="field-error" id="qa-answer-error" role="alert">
                {error}
              </p>
            </div>
            <Button type="submit">Submit answer</Button>
          </fieldset>
        </form>
      )}
      <p role="status" tabIndex={-1} ref={status} className="session-status">
        {feedback}
      </p>
    </section>
  );
}
