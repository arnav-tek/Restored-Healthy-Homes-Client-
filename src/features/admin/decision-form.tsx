"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import type { DemoMemberRecord } from "@/domain/demo-member";
import { parseReviewReason, reviewReasonLimit } from "@/validation/admin";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";

export function DecisionForm({
  record,
  purpose,
}: {
  record: DemoMemberRecord;
  purpose: "application" | "listing";
}) {
  const { dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `decision:${purpose}:${record.id}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const [feedback, setFeedback] = useState("");
  const defaultAction =
    purpose === "application"
      ? "approved"
      : record.suspended
        ? "reinstate"
        : "suspend";
  if (purpose === "listing" && record.approval !== "approved")
    return (
      <p className="workspace-empty">
        Only approved examples can be suspended or reinstated. Review this
        application first.
      </p>
    );
  return (
    <section className="panel decision-panel">
      <h2>
        {purpose === "application"
          ? "Application decision"
          : "Listing decision"}
      </h2>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          const data = new FormData(event.currentTarget);
          const reason = parseReviewReason(data.get("reason"));
          if (!reason) {
            setError("Enter a reason of 3–300 characters.");
            reasonInput.current?.focus();
            return;
          }
          setError("");
          const decision = data.get("decision");
          if (
            decision === "rejected" &&
            !window.confirm(
              `Reject ${record.profile.businessName} in this demo? Nothing will be sent.`,
            )
          )
            return;
          if (
            decision === "suspend" &&
            !window.confirm(
              `Suspend ${record.profile.businessName} in this demo? It will leave the session directory preview.`,
            )
          )
            return;
          if (
            purpose === "application" &&
            (decision === "approved" || decision === "rejected")
          )
            dispatch({
              type: "decide",
              id: record.id,
              approval: decision,
              reason,
            });
          else if (
            purpose === "listing" &&
            (decision === "suspend" || decision === "reinstate")
          )
            dispatch({
              type: "suspend",
              id: record.id,
              suspended: decision === "suspend",
              reason,
            });
          else return;
          clearDraft();
          setFeedback(
            `Local decision updated for ${record.profile.businessName}. Nothing sent or published.`,
          );
          requestAnimationFrame(() => status.current?.focus());
        }}
      >
        <fieldset className="member-form-fields" disabled={!ready}>
          <legend className="sr-only">
            Local decision for {record.profile.businessName}
          </legend>
          <div className="search-field">
            <label htmlFor="review-decision">Demo action</label>
            <select
              id="review-decision"
              name="decision"
              value={String(draft?.decision ?? defaultAction)}
              onChange={(event) =>
                saveDraft({ ...draft, decision: event.target.value })
              }
            >
              {purpose === "application" ? (
                <>
                  <option value="approved">Approve application</option>
                  <option value="rejected">Reject application</option>
                </>
              ) : (
                <option value={defaultAction}>
                  {record.suspended ? "Reinstate listing" : "Suspend listing"}
                </option>
              )}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="review-reason">Applicant-facing demo reason</label>
            <textarea
              id="review-reason"
              name="reason"
              ref={reasonInput}
              value={String(draft?.reason ?? "")}
              onChange={(event) =>
                saveDraft({ ...draft, reason: event.target.value })
              }
              maxLength={reviewReasonLimit}
              rows={3}
              aria-invalid={!!error}
              aria-describedby="reason-help reason-error"
            />
            <p id="reason-help" className="field-help">
              3–300 characters. Visible to the member in this demo; no
              notification is sent.
            </p>
            <p id="reason-error" className="field-error" role="alert">
              {error}
            </p>
          </div>
          <Button type="submit">Apply demo decision</Button>
        </fieldset>
      </form>
      <p className="field-help">
        Approval never activates a subscription or clears suspension.
        Reinstatement still requires an active subscription for eligibility.
      </p>
      <p ref={status} tabIndex={-1} role="status" className="session-status">
        {feedback}
      </p>
    </section>
  );
}
