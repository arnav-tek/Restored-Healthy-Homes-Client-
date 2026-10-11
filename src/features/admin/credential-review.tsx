"use client";
import { useRef, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import type { DemoMemberRecord } from "@/domain/demo-member";
import { useDemoSession } from "@/features/member/demo-session";

export function CredentialReview({ record }: { record: DemoMemberRecord }) {
  const { dispatch } = useDemoSession();
  const ready = useDemoReady();
  const [feedback, setFeedback] = useState("");
  const status = useRef<HTMLParagraphElement>(null);

  return (
    <section className="panel admin-detail-card credential-review-panel">
      <h2 className="admin-detail-heading">Credential review</h2>
      <p className="admin-card-desc">
        Restored Healthy Homes does not issue certifications. New or changed credentials require review.
      </p>
      {record.credentials.length ? (
        <ul className="credential-review-list">
          {record.credentials.map((claim) => (
            <li key={claim.id} className="credential-review-item">
              <div className="credential-info">
                <div className="credential-text-row">
                  {claim.verification === "verified" ? (
                    <ShieldCheck size={18} className="text-sage" aria-hidden="true" />
                  ) : (
                    <ShieldAlert size={18} className="text-terracotta" aria-hidden="true" />
                  )}
                  <strong>{claim.text}</strong>
                </div>
                <div className="credential-status-row">
                  <span
                    className={`admin-status-badge badge-${
                      claim.verification === "verified" ? "approved" : "pending"
                    }`}
                  >
                    {claim.verification === "verified"
                      ? "Reviewed"
                      : "Unverified"}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                className={
                  claim.verification === "verified"
                    ? "button-secondary"
                    : "button-primary"
                }
                disabled={!ready}
                onClick={() => {
                  if (
                    claim.verification === "verified" &&
                    !window.confirm(
                      `Remove review status for “${claim.text}” for ${record.profile.businessName}?`,
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
                  setFeedback(
                    `${claim.text}: ${claim.verification === "verified" ? "verification removed" : "reviewed"}.`,
                  );
                  requestAnimationFrame(() => status.current?.focus());
                }}
              >
                {claim.verification === "verified"
                  ? "Remove review status"
                  : "Mark as reviewed"}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="workspace-empty">No credentials submitted for review.</p>
      )}
      <p ref={status} tabIndex={-1} role="status" className="session-status">
        {feedback}
      </p>
    </section>
  );
}
