"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnswerFields } from "./answer-fields";
import { Button } from "@/components/ui/button";
import { parseAnswer } from "@/validation/qa-moderation";
import { isRecord } from "@/validation/member-account";
export function ConnectedAnswerForm({
  questionId,
  initial = "",
  version,
}: {
  questionId: string;
  initial?: string;
  version?: number;
}) {
  const router = useRouter(),
    [body, setBody] = useState(initial),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState("");
  const input = useRef<HTMLTextAreaElement>(null),
    feedback = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = parseAnswer(body);
    if (!parsed) {
      setError("Use 20–3,000 characters for your answer.");
      input.current?.focus();
      return;
    }
    setPending(true);
    setError("");
    setNotice("");
    let confirmed = false;
    try {
      const r = await fetch("/api/member/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId,
          body: parsed,
          ...(version === undefined ? {} : { version }),
        }),
      });
      const raw: unknown = await r.json();
      if (!r.ok || !isRecord(raw) || raw.saved !== true)
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Save could not be confirmed. Your draft is retained.",
        );
      setNotice(
        "Answer saved. Pending content requires moderation; this does not publish it or send email.",
      );
      confirmed = true;
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save could not be confirmed. Your draft is retained.",
      );
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        if (confirmed) feedback.current?.focus();
        else input.current?.focus();
      });
    }
  }
  return (
    <section className="panel">
      <h2>
        {version === undefined ? "Your answer" : "Edit your pending answer"}
      </h2>
      <p>
        Share service information, not personal medical history or clinical
        advice. Only an eligible specialist in this category can answer.
        Reviewed answers cannot be edited here. Editing a pending answer moves
        it to the end of the moderation order.
      </p>
      <form noValidate onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending} className="member-form-fields">
          <legend className="sr-only">Draft an answer</legend>
          <AnswerFields
            id={`qa-answer-${questionId}`}
            inputRef={input}
            value={body}
            onChange={setBody}
            error={error}
          />
          <Button type="submit">
            {pending
              ? "Saving…"
              : version === undefined
                ? "Submit answer"
                : "Save pending answer"}
          </Button>
        </fieldset>
        <noscript>JavaScript is required to submit an answer.</noscript>
      </form>
      <p ref={feedback} tabIndex={-1} role="status">
        {notice}
      </p>
      {error && (
        <p className="field-help">
          Your draft is still here.{" "}
          <Link
            href={`/member/questions/${questionId}`}
            target="_blank"
            rel="noopener"
          >
            Compare the saved answer in another tab
          </Link>{" "}
          before retrying.
        </p>
      )}
    </section>
  );
}
