"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { SessionReset } from "@/features/dashboard/session-reset";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import {
  parseQuestion,
  questionFieldOrder,
  questionLimits,
  type QuestionErrors,
  type QuestionField,
} from "@/validation/qa";

export function QuestionForm({
  catalog,
  returnTo,
}: {
  catalog: readonly { id: string; name: string }[];
  returnTo: string;
}) {
  const { state, dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft("question");
  const ready = useDemoReady();
  const [errors, setErrors] = useState<QuestionErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const submitted = state.questions.find(
    (question) => question.id === state.questionId,
  );
  useEffect(() => {
    if (submitted) confirmation.current?.focus();
  }, [submitted]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const data = new FormData(event.currentTarget);
    const result = parseQuestion({
      title: data.get("title"),
      categoryId: data.get("categoryId"),
      body: data.get("body"),
    });
    if (!result.ok) {
      setErrors(result.errors);
      const first = questionFieldOrder.find((field) => result.errors[field]);
      const control = form.current?.elements.namedItem(first ?? "title");
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    setErrors({});
    dispatch({ type: "submit-question", question: result.question });
    clearDraft();
  }
  function props(field: QuestionField) {
    return {
      id: `question-${field}`,
      name: field,
      required: true,
      "aria-invalid": !!errors[field],
      "aria-describedby": `${field}-help ${field}-error`,
    };
  }
  return (
    <>
      {submitted ? (
        <section
          className="panel qa-confirmation"
          aria-labelledby="question-confirmation"
        >
          <span className="demo-pill">Pending demo question</span>
          <h2 id="question-confirmation" ref={confirmation} tabIndex={-1}>
            Awaiting fictional review
          </h2>
          <p>
            <strong>{submitted.title}</strong>
          </p>
          <p>
            Your question is not publicly visible, has not been sent to
            professionals, and is not saved permanently. It exists only in this
            tab’s demo session. Review controls will be added in a later phase.
          </p>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => {
              dispatch({ type: "new-question" });
              setErrors({});
              requestAnimationFrame(() =>
                document.getElementById("question-title")?.focus(),
              );
            }}
          >
            Ask another demo question
          </Button>
        </section>
      ) : (
        <form
          ref={form}
          noValidate
          autoComplete="off"
          onSubmit={submit}
          className="panel qa-form"
          aria-describedby="question-demo-note"
        >
          <p id="question-demo-note">
            <strong>Demo only.</strong> Use fictional information. Do not
            include medical histories, contact details or other personal
            information. Nothing is sent to professionals or saved permanently.
          </p>
          <noscript>
            <p>
              Enable JavaScript to try this form. Submission is disabled and no
              submission endpoint exists. You can still browse published sample
              questions.
            </p>
          </noscript>
          {draft && (
            <p className="draft-note">
              Your unfinished draft is kept while you navigate within this tab.
            </p>
          )}
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="field-error">
              Check the highlighted fields. Nothing has been submitted.
            </p>
          )}
          <fieldset disabled={!ready} className="member-form-fields">
            <legend className="sr-only">Your fictional question</legend>
            <div className="search-field">
              <label htmlFor="question-title">Question title</label>
              <input
                {...props("title")}
                value={String(draft?.title ?? "")}
                maxLength={questionLimits.title}
                onChange={(event) =>
                  saveDraft({ ...draft, title: event.target.value })
                }
              />
              <p id="title-help" className="field-help">
                10–160 characters. Summarize a service or home-project question.
              </p>
              <p id="title-error" className="field-error">
                {errors.title}
              </p>
            </div>
            <div className="search-field">
              <label htmlFor="question-categoryId">Relevant category</label>
              <select
                {...props("categoryId")}
                value={String(draft?.categoryId ?? "")}
                onChange={(event) =>
                  saveDraft({ ...draft, categoryId: event.target.value })
                }
              >
                <option value="">Choose a category</option>
                {catalog.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p id="categoryId-help" className="field-help">
                Choose the one category that best fits your question.
              </p>
              <p id="categoryId-error" className="field-error">
                {errors.categoryId}
              </p>
            </div>
            <div className="search-field">
              <label htmlFor="question-body">Question text</label>
              <textarea
                {...props("body")}
                value={String(draft?.body ?? "")}
                rows={7}
                maxLength={questionLimits.body}
                onChange={(event) =>
                  saveDraft({ ...draft, body: event.target.value })
                }
              />
              <p id="body-help" className="field-help">
                20–2,000 characters. Describe a fictional project and what you
                would like to ask.
              </p>
              <p id="body-error" className="field-error">
                {errors.body}
              </p>
            </div>
            <Button type="submit">Submit demo question</Button>
          </fieldset>
        </form>
      )}
      <div className="qa-form-footer">
        <Link className="text-link" href={returnTo}>
          Back to questions
        </Link>
        <SessionReset
          onReset={() => {
            setErrors({});
            requestAnimationFrame(() =>
              document.getElementById("question-title")?.focus(),
            );
          }}
        />
      </div>
      <p className="field-help">
        Refresh, full-page navigation or confirmed reset clears submissions and
        drafts. Reset clears the entire shared demo session, including member
        and admin changes.
      </p>
    </>
  );
}
