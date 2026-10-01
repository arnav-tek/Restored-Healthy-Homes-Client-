"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import type { DemoMemberRecord } from "@/domain/demo-member";
import { memberEligibilityMessage } from "@/domain/demo-member";
import { parseReviewReason, reviewReasonLimit } from "@/validation/admin";
import { useDemoSession } from "@/features/member/demo-session";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";

export function ApplicationReview({
  record,
  catalog,
}: {
  record: DemoMemberRecord;
  catalog: readonly ApplicationCategory[];
}) {
  const { dispatch } = useDemoSession();
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const [feedback, setFeedback] = useState("");
  const profile = record.profile;
  function announce() {
    setFeedback(
      "Local review updated. Nothing was sent to the applicant or published.",
    );
    requestAnimationFrame(() => status.current?.focus());
  }
  return (
    <section className="panel admin-review" aria-labelledby="review-heading">
      <h2 id="review-heading" tabIndex={-1}>
        Review {profile.businessName}
      </h2>
      <p>
        Fictional application details. Contact details below are for this review
        only.
      </p>
      <dl className="admin-details">
        <div>
          <dt>Applicant</dt>
          <dd>{profile.name}</dd>
        </div>
        <div>
          <dt>Contact email</dt>
          <dd>{profile.email}</dd>
        </div>
        <div>
          <dt>Phone / website</dt>
          <dd>
            {profile.phone || "No phone supplied"}
            <br />
            {profile.website || "No website supplied"}
          </dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {profile.city}, {profile.state}
          </dd>
        </div>
        <div>
          <dt>Categories</dt>
          <dd>
            {catalog
              .filter((item) => profile.categoryIds.includes(item.id))
              .map((item) => item.name)
              .join(" · ")}
          </dd>
        </div>
        <div>
          <dt>Services</dt>
          <dd>{profile.services.join(" · ")}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{profile.description}</dd>
        </div>
        <div>
          <dt>Healthy-home practices</dt>
          <dd>{profile.practices}</dd>
        </div>
        <div>
          <dt>Application</dt>
          <dd data-testid="admin-approval">{record.approval}</dd>
        </div>
        <div>
          <dt>Subscription (read-only)</dt>
          <dd>{record.subscription}</dd>
        </div>
        <div>
          <dt>Suspension</dt>
          <dd>{record.suspended ? "Suspended" : "None"}</dd>
        </div>
      </dl>
      <p>{memberEligibilityMessage(record)}</p>
      <p>
        Decision reason: {record.decisionReason || "No decision reason yet."}
      </p>
      {record.suspensionReason && (
        <p>Suspension / reinstatement reason: {record.suspensionReason}</p>
      )}
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
              `Reject ${profile.businessName} in this demo? Nothing will be sent.`,
            )
          )
            return;
          if (
            decision === "suspend" &&
            !window.confirm(
              `Suspend ${profile.businessName} in this demo? It will leave the session directory preview.`,
            )
          )
            return;
          if (decision === "approved" || decision === "rejected")
            dispatch({
              type: "decide",
              id: record.id,
              approval: decision,
              reason,
            });
          else if (decision === "suspend" || decision === "reinstate")
            dispatch({
              type: "suspend",
              id: record.id,
              suspended: decision === "suspend",
              reason,
            });
          else return;
          announce();
        }}
      >
        <fieldset className="member-form-fields" disabled={!ready}>
          <legend>Local application decision</legend>
          <div className="search-field">
            <label htmlFor="review-decision">Demo action</label>
            <select id="review-decision" name="decision">
              <option value="approved">Approve application</option>
              <option value="rejected">Reject application</option>
              {record.approval === "approved" && (
                <option value={record.suspended ? "reinstate" : "suspend"}>
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
              maxLength={reviewReasonLimit}
              rows={3}
              aria-invalid={!!error}
              aria-describedby="reason-help reason-error"
            />
            <p id="reason-help" className="field-help">
              Use a short fictional reason. It appears in the member workspace;
              no notification is sent. 3–300 characters.
            </p>
            <p id="reason-error" className="field-error" role="alert">
              {error}
            </p>
          </div>
          <Button type="submit">Apply demo decision</Button>
        </fieldset>
      </form>
      <p>
        Approval never activates a subscription. Reinstatement still requires an
        active subscription for eligibility.
      </p>
      <h3>Credential review</h3>
      <p>
        Verify only a fictional claim in this demo. Restored Healthy Homes does
        not issue certifications. Edited claims require a new review.
      </p>
      {record.credentials.length ? (
        <ul className="credential-review-list">
          {record.credentials.map((claim) => (
            <li key={claim.id}>
              <div>
                <strong>{claim.text}</strong>
                <p>
                  {claim.verification === "verified"
                    ? "Verified in demo only"
                    : "Unverified"}
                </p>
              </div>
              <Button
                type="button"
                disabled={!ready}
                onClick={() => {
                  if (
                    claim.verification === "verified" &&
                    !window.confirm(
                      `Remove demo verification of “${claim.text}” for ${profile.businessName}?`,
                    )
                  )
                    return;
                  dispatch({
                    type: "credential",
                    id: record.id,
                    credentialId: claim.id,
                    verification:
                      claim.verification === "verified"
                        ? "unverified"
                        : "verified",
                  });
                  announce();
                }}
              >
                {claim.verification === "verified"
                  ? "Remove demo verification"
                  : "Verify in demo"}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No credentials submitted for review.</p>
      )}
      <p ref={status} tabIndex={-1} role="status">
        {feedback}
      </p>
    </section>
  );
}
