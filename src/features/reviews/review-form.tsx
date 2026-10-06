"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import { SessionReset } from "@/features/dashboard/session-reset";
import { currentReviewSubmission } from "@/domain/review-session";
import { ReviewRating } from "./review-content";
import {
  parseReview,
  reviewFieldOrder,
  reviewLimits,
  type ReviewErrors,
  type ReviewField,
} from "@/validation/review";

export function ReviewForm({ professionalId }: { professionalId: string }) {
  const { resetVersion } = useDemoSession();
  return (
    <LocalReviewForm
      key={`${professionalId}-${resetVersion}`}
      professionalId={professionalId}
    />
  );
}
function LocalReviewForm({ professionalId }: { professionalId: string }) {
  const { state, dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `review:${professionalId}`,
  );
  const ready = useDemoReady();
  const eligible = state.publicProfessionalIds.includes(professionalId);
  const [errors, setErrors] = useState<ReviewErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const submitted = currentReviewSubmission(state.reviews, professionalId);
  const submittedId = submitted?.id;
  const submittedStatus = submitted?.status;
  useEffect(() => {
    if (submittedId) confirmation.current?.focus();
  }, [submittedId, submittedStatus]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !eligible || submitted) return;
    const data = new FormData(event.currentTarget);
    const parsed = parseReview(
      Object.fromEntries(
        reviewFieldOrder.map((field) => [field, data.get(field)]),
      ),
    );
    if (!parsed.ok) {
      setErrors(parsed.errors);
      const first = reviewFieldOrder.find((field) => parsed.errors[field]);
      const control = form.current?.elements.namedItem(first ?? "displayName");
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    // The eligible server profile supplies the target; no target/status/verification form fields.
    dispatch({ type: "submit-review", professionalId, fields: parsed.fields });
    clearDraft();
    setErrors({});
  }
  function fieldProps(field: ReviewField) {
    return {
      id: `review-${field}`,
      name: field,
      required: true,
      value: String(draft?.[field] ?? ""),
      "aria-invalid": !!errors[field],
      "aria-describedby": `review-${field}-help review-${field}-error`,
      onChange: (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => saveDraft({ ...draft, [field]: event.target.value }),
    };
  }
  function error(field: ReviewField) {
    return (
      <p className="field-error" id={`review-${field}-error`}>
        {errors[field]}
      </p>
    );
  }
  return (
    <div className="review-submission">
      {submitted ? (
        <section
          className="panel review-confirmation"
          aria-labelledby="review-confirmation-heading"
        >
          <h3 id="review-confirmation-heading" tabIndex={-1} ref={confirmation}>
            Demo review {submitted.status}
          </h3>
          <p>
            {submitted.status === "published"
              ? "Published in this tab’s demo preview only. This review now contributes to the sample rating."
              : submitted.status === "rejected"
                ? "Rejected in this demo session. This review is excluded from public and member review lists and the sample rating."
                : "Pending in this demo session. Not published or delivered. Your review does not change the public rating."}{" "}
            Nothing is sent or saved permanently. Refresh or reset restores the
            original samples.
          </p>
          <p className="field-help">Reference: {submitted.id}</p>
          <p>
            <strong>{submitted.displayName}</strong> ·{" "}
            <ReviewRating value={submitted.rating} />
          </p>
          <p className="review-body">{submitted.body}</p>
          <Button
            type="button"
            className="button-secondary"
            onClick={(event) => {
              // A rapid second submit click can land here after the layout changes.
              if (event.detail > 1) return;
              dispatch({ type: "new-review", professionalId });
              requestAnimationFrame(() =>
                document.getElementById("review-displayName")?.focus(),
              );
            }}
          >
            Start another demo review
          </Button>
        </section>
      ) : (
        <form
          ref={form}
          className="panel review-form"
          onSubmit={submit}
          noValidate
          autoComplete="off"
          aria-labelledby="review-form-heading"
          aria-describedby="review-demo-note"
        >
          <h3 id="review-form-heading">Try a demo review</h3>
          <p id="review-demo-note">
            Use fictional information only. Nothing is sent or saved
            permanently. Do not include email, medical information or other
            sensitive details. Guest reviews are a provisional demo policy;
            service verification and moderation rules remain undecided.
          </p>
          <noscript>
            <p>
              Enable JavaScript to try this session-only form. Controls are
              disabled; nothing is submitted.
            </p>
          </noscript>
          {Object.keys(errors).length > 0 && (
            <div className="field-error" role="alert">
              <p>Check the review fields below:</p>
              <ul>
                {reviewFieldOrder
                  .filter((field) => errors[field])
                  .map((field) => (
                    <li key={field}>
                      <a
                        href={`#review-${field}`}
                        onClick={(event) => {
                          event.preventDefault();
                          document.getElementById(`review-${field}`)?.focus();
                        }}
                      >
                        {errors[field]}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <fieldset
            className="member-form-fields"
            disabled={!ready || !eligible}
          >
            <legend className="sr-only">Fictional review details</legend>
            <div className="search-field">
              <label htmlFor="review-displayName">Display name (sample)</label>
              <input
                {...fieldProps("displayName")}
                type="text"
                maxLength={reviewLimits.displayName}
                minLength={2}
              />
              <p className="field-help" id="review-displayName-help">
                2–80 characters. Use a fictional name.
              </p>
              {error("displayName")}
            </div>
            <div className="search-field">
              <label htmlFor="review-rating">Rating (sample)</label>
              <select {...fieldProps("rating")}>
                <option value="">Choose a rating</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} out of 5
                  </option>
                ))}
              </select>
              <p className="field-help" id="review-rating-help">
                A whole number from 1 to 5.
              </p>
              {error("rating")}
            </div>
            <div className="search-field">
              <label htmlFor="review-body">Written review (sample)</label>
              <textarea
                {...fieldProps("body")}
                rows={5}
                maxLength={reviewLimits.body}
                minLength={20}
              />
              <p className="field-help" id="review-body-help">
                20–2,000 characters describing a fictional service experience.
              </p>
              {error("body")}
            </div>
            <Button type="submit">Submit demo review</Button>
          </fieldset>
          {ready && !eligible && (
            <p role="status">
              Review submission is unavailable for this profile in this session.
              Refresh to start a new demo session.
            </p>
          )}
        </form>
      )}
      <div className="review-reset">
        <SessionReset />
        <p className="field-help">
          Reset clears all demo workflows, drafts and sign-in. Refresh also
          clears this tab’s session. Repeated-click handling here is a demo
          convenience, not production duplicate-review or abuse prevention.
        </p>
      </div>
    </div>
  );
}
