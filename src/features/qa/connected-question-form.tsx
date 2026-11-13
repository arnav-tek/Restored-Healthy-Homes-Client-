"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { QuestionFieldsEditor } from "./question-fields";
import type { QuestionFields } from "@/domain/qa";
import {
  parseQuestion,
  questionFieldOrder,
  type QuestionErrors,
} from "@/validation/qa";
import { isRecord } from "@/validation/member-account";
export function ConnectedQuestionForm({
  catalog,
  returnTo,
}: {
  catalog: readonly { id: string; name: string }[];
  returnTo: string;
}) {
  const [value, setValue] = useState<QuestionFields>({
      title: "",
      body: "",
      categoryId: "",
    }),
    [errors, setErrors] = useState<QuestionErrors>({}),
    [failure, setFailure] = useState(""),
    [pending, setPending] = useState(false),
    [saved, setSaved] = useState(false);
  const request = useRef<string | null>(null),
    payload = useRef(""),
    form = useRef<HTMLFormElement>(null),
    feedback = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = parseQuestion(value, catalog);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      const first = questionFieldOrder.find((k) => parsed.errors[k]);
      (
        form.current?.elements.namedItem(first ?? "title") as HTMLElement | null
      )?.focus();
      return;
    }
    const serialized = JSON.stringify(parsed.question);
    if (!request.current || payload.current !== serialized) {
      request.current = crypto.randomUUID();
      payload.current = serialized;
    }
    setPending(true);
    setErrors({});
    setFailure("");
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...parsed.question,
          requestId: request.current,
        }),
      });
      const raw: unknown = await response.json();
      if (
        !response.ok ||
        !isRecord(raw) ||
        raw.saved !== true ||
        raw.status !== "pending"
      )
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Saving could not be confirmed. Your draft is still here.",
        );
      setSaved(true);
    } catch (e) {
      setFailure(
        e instanceof Error
          ? e.message
          : "Saving could not be confirmed. Your draft is still here.",
      );
    } finally {
      setPending(false);
      requestAnimationFrame(() => feedback.current?.focus());
    }
  }
  return (
    <>
      {saved ? (
        <section className="panel qa-confirmation">
          <h2>Question saved for review</h2>
          <p>
            Your question was saved as pending. It will appear publicly and in
            matching category inboxes only after moderation. Email delivery is
            disabled.
          </p>
          <Button
            type="button"
            onClick={() => {
              setSaved(false);
              setValue({ title: "", body: "", categoryId: "" });
              request.current = null;
              requestAnimationFrame(() =>
                document.getElementById("question-title")?.focus(),
              );
            }}
          >
            Ask another question
          </Button>
        </section>
      ) : (
        <form
          ref={form}
          className="panel qa-form"
          aria-describedby="question-privacy"
          noValidate
          onSubmit={submit}
          aria-busy={pending}
        >
          <p id="question-privacy">
            Questions are intended for public display. Leave out names, contact
            details, personal medical histories and other sensitive information.
            We do not automatically anonymize your text. No account or contact
            details are collected with this form.
          </p>
          <fieldset disabled={pending} className="member-form-fields">
            <legend className="sr-only">Your question</legend>
            <QuestionFieldsEditor
              value={value}
              onChange={setValue}
              errors={errors}
              catalog={catalog}
            />
            <Button type="submit">
              {pending ? "Saving…" : "Submit question"}
            </Button>
          </fieldset>
          <noscript>
            JavaScript is required to securely submit this form.
          </noscript>
        </form>
      )}
      <p
        ref={feedback}
        role={failure ? "alert" : "status"}
        tabIndex={-1}
        className={failure ? "field-error" : "field-help"}
      >
        {failure ||
          (saved
            ? "Your question has been saved."
            : "Unsaved drafts remain on this page; leaving or refreshing clears them.")}
      </p>
      <Link className="text-link" href={returnTo}>
        Back to questions
      </Link>
    </>
  );
}
