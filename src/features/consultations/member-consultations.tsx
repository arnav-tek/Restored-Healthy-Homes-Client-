"use client";
import Link from "next/link";
import { useRef } from "react";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { consultationPolicy } from "@/domain/consultation";
import { ownConsultations } from "@/domain/consultation-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { ConsultationSummary } from "./summary";
import { ConsultationFilters } from "./workspace-filters";
export function MemberConsultations({ disabled }: { disabled: boolean }) {
  const { state, dispatch } = useDemoSession();
  const { query, href } = useDashboardNavigation("member");
  const ready = useDemoReady();
  const feedback = useRef<HTMLParagraphElement>(null);
  const requests = disabled ? [] : ownConsultations(state);
  const selected = requests.find(
    (request) => request.id === query.consultation,
  );
  const matching = requests.filter(
    (request) =>
      query.consultationStatus === "all" ||
      request.status === query.consultationStatus,
  );
  return (
    <div className="consultation-workspace">
      <p className="field-help">{consultationPolicy}</p>
      <p>
        Accepted for demo coordination does not mean an appointment was booked,
        payment was taken or a message was sent.
      </p>
      {query.consultation ? (
        <>
          <Link className="text-link" href={href({ consultation: "" })}>
            ← Back to your consultations
          </Link>
          {selected ? (
            <article className="panel consultation-detail">
              <h2>Request {selected.id}</h2>
              <ConsultationSummary
                request={selected}
                category={state.categoryNames[selected.categoryId]}
              />
              <h3>Fictional topic</h3>
              <p className="consultation-topic">{selected.topic}</p>
              {selected.needsAttention && (
                <p className="field-error">
                  Needs admin attention: category or eligibility has changed.
                  Acceptance is blocked; admin can review the assignment.
                </p>
              )}
              {selected.status === "assigned" && (
                <fieldset
                  disabled={!ready || disabled}
                  className="member-form-fields"
                >
                  <legend>Respond to your demo assignment</legend>
                  <div className="filter-actions">
                    <button
                      type="button"
                      className="button"
                      disabled={selected.needsAttention}
                      onClick={() => {
                        if (!ready || disabled) return;
                        dispatch({
                          type: "accept-consultation",
                          id: selected.id,
                        });
                        requestAnimationFrame(() => feedback.current?.focus());
                      }}
                    >
                      Accept demo coordination
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        if (!ready || disabled) return;
                        dispatch({
                          type: "decline-consultation",
                          id: selected.id,
                        });
                        requestAnimationFrame(() => feedback.current?.focus());
                      }}
                    >
                      Decline demo assignment
                    </button>
                  </div>
                </fieldset>
              )}
            </article>
          ) : (
            <p className="workspace-empty">
              This consultation is unavailable for the selected member in this
              tab. Return to your assignments.
            </p>
          )}
        </>
      ) : (
        <>
          <ConsultationFilters area="member" />
          <p role="status">
            {matching.length} of {requests.length} assigned demo requests shown
          </p>
          <ol className="qa-list">
            {matching.map((request) => (
              <li key={request.id}>
                <article>
                  <h2>
                    <Link href={href({ consultation: request.id })}>
                      Open {request.id}
                    </Link>
                  </h2>
                  <ConsultationSummary
                    request={request}
                    category={state.categoryNames[request.categoryId]}
                  />
                  {request.needsAttention && (
                    <p className="field-error">
                      Needs admin attention: category or eligibility has
                      changed.
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
          {!matching.length && (
            <p className="workspace-empty">
              No matching assignments for this demo member. Admin assigns
              eligible members; submitting a public request does not assign it
              automatically.
            </p>
          )}
        </>
      )}
      <p role="status" ref={feedback} tabIndex={-1}>
        {state.notice}
      </p>
    </div>
  );
}
