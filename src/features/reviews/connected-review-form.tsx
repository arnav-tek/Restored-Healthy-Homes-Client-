"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import {
  parseReview,
  reviewFieldOrder,
  reviewLimits,
  type ReviewErrors,
  type ReviewField,
} from "@/validation/review";
import { isRecord } from "@/validation/member-account";
export function ConnectedReviewForm({
  professionalId,
}: {
  professionalId: string;
}) {
  const ready = useDemoReady(),
    [values, setValues] = useState({ displayName: "", rating: "", body: "" }),
    [errors, setErrors] = useState<ReviewErrors>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const key = useRef<{ content: string; id: string } | null>(null),
    form = useRef<HTMLFormElement>(null),
    confirmation = useRef<HTMLHeadingElement>(null);
  function change(field: ReviewField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || busy) return;
    const parsed = parseReview(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      const field = reviewFieldOrder.find((f) => parsed.errors[f]);
      const input = form.current?.elements.namedItem(field ?? "displayName");
      if (input instanceof HTMLElement) input.focus();
      return;
    }
    setErrors({});
    setError("");
    setBusy(true);
    const content = JSON.stringify(parsed.fields);
    if (!key.current || key.current.content !== content)
      key.current = { content, id: crypto.randomUUID() };
    try {
      const r = await fetch(`/api/public/reviews/${professionalId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.fields, requestId: key.current.id }),
      });
      const raw: unknown = await r.json();
      if (!r.ok || !isRecord(raw) || raw.saved !== true)
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Saving could not be confirmed. Your draft is retained.",
        );
      setSaved(true);
      requestAnimationFrame(() => confirmation.current?.focus());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Saving could not be confirmed. Keep your draft.",
      );
    } finally {
      setBusy(false);
    }
  }
  const props = (field: ReviewField) => ({
    id: `review-${field}`,
    name: field,
    value: values[field],
    required: true,
    "aria-invalid": !!errors[field],
    "aria-describedby": `review-${field}-help review-${field}-error`,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => change(field, e.target.value),
  });
  return saved ? (
    <section
      className="panel review-confirmation"
      aria-labelledby="review-confirmation-heading"
    >
      <h3 id="review-confirmation-heading" ref={confirmation} tabIndex={-1}>
        Your review has been saved
      </h3>
      <p>
        Reviews require moderation before publication. Only published reviews
        affect ratings. This confirmation does not verify customer identity or
        guarantee publication or email delivery.
      </p>
      <p>
        Your display name, score and text will be public if the review is
        published.
      </p>
    </section>
  ) : (
    <form
      ref={form}
      className="panel review-form"
      noValidate
      autoComplete="off"
      onSubmit={submit}
      aria-labelledby="review-form-heading"
      aria-busy={busy}
    >
      <h3 id="review-form-heading">Write a review</h3>
      <p>
        Use a public display name and describe your service experience. Leave
        out contact details, personal medical information and other sensitive
        information. Text is not automatically anonymized. Reviews are
        moderated; customer or purchase verification is not claimed.
      </p>
      <fieldset
        className="member-form-fields min-w-0"
        disabled={!ready || busy}
        style={{ gridTemplateColumns: "minmax(0,1fr)" }}
      >
        <legend className="sr-only">Review details</legend>
        <div className="search-field">
          <label htmlFor="review-displayName">Display name</label>
          <input
            {...props("displayName")}
            minLength={2}
            maxLength={reviewLimits.displayName}
          />
          <p id="review-displayName-help" className="field-help">
            2–80 characters; shown publicly on publication.
          </p>
          <p id="review-displayName-error" className="field-error">
            {errors.displayName}
          </p>
        </div>
        <div className="search-field">
          <label htmlFor="review-rating">Rating</label>
          <select {...props("rating")}>
            <option value="">Choose a rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} out of 5
              </option>
            ))}
          </select>
          <p id="review-rating-help" className="field-help">
            Choose a whole-number score from 1 to 5.
          </p>
          <p id="review-rating-error" className="field-error">
            {errors.rating}
          </p>
        </div>
        <div className="search-field">
          <label htmlFor="review-body">Your review</label>
          <textarea
            {...props("body")}
            rows={5}
            minLength={20}
            maxLength={reviewLimits.body}
          />
          <p id="review-body-help" className="field-help">
            20–2,000 characters. Published text is public.
          </p>
          <p id="review-body-error" className="field-error">
            {errors.body}
          </p>
        </div>
        <Button type="submit">{busy ? "Saving…" : "Submit review"}</Button>
      </fieldset>
      <noscript>JavaScript is required to submit a review.</noscript>
      <p role="alert" className="field-error">
        {error}
      </p>
      {error && (
        <p className="field-help">
          Your draft is retained. Retry unchanged content to acknowledge an
          uncertain save without creating another review.
        </p>
      )}
    </form>
  );
}
