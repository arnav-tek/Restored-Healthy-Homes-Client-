"use client";
import { useRef, useState } from "react";
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
    <section className="panel">
      <h2>Credential review</h2>
      <p>
        Decisions here are fictional. Restored Healthy Homes does not issue
        certifications. New or changed claims require review.
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
                      `Remove demo verification of “${claim.text}” for ${record.profile.businessName}?`,
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
                    `${claim.text}: ${claim.verification === "verified" ? "verification removed" : "verified in demo only"}.`,
                  );
                  requestAnimationFrame(() => status.current?.focus());
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
        <p className="workspace-empty">No credentials submitted for review.</p>
      )}
      <p ref={status} tabIndex={-1} role="status" className="session-status">
        {feedback}
      </p>
    </section>
  );
}
