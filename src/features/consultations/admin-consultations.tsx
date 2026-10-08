"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import {
  consultationPolicy,
  consultationStatuses,
  consultationStatusLabels,
  type DemoConsultationRequest,
} from "@/domain/consultation";
import {
  canCoordinate,
  consultationNeedsAttention,
  publicConsultationSummary,
  type ConsultationAction,
} from "@/domain/consultation-session";
import {
  coordinationNoteLimit,
  parseCoordinationNote,
} from "@/validation/consultation";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { ConsultationSummary } from "./summary";
import { ConsultationFilters } from "./workspace-filters";

export function AdminConsultations() {
  const { state } = useDemoSession();
  const { query, href } = useDashboardNavigation("admin");
  const selected = state.consultations.find(
    (request) => request.id === query.consultation,
  );
  const matches = state.consultations.filter(
    (request) =>
      (query.consultationStatus === "all" ||
        query.consultationStatus === request.status) &&
      (!query.category || request.categoryId === query.category) &&
      (query.assignment === "all" ||
        (query.assignment === "assigned"
          ? request.providerId !== null
          : request.providerId === null)),
  );
  return (
    <div className="consultation-workspace">
      <p className="field-help">{consultationPolicy}</p>
      {query.consultation ? (
        <>
          <Link className="text-link" href={href({ consultation: "" })}>
            ← Back to consultation requests
          </Link>
          {selected ? (
            <AdminConsultationDetail key={selected.id} request={selected} />
          ) : (
            <p className="workspace-empty">
              This consultation is unavailable in this tab. Return to requests or create a request.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="workspace-metrics">
            {consultationStatuses.map((status) => (
              <Link
                key={status}
                href={href({
                  consultationStatus: status,
                  category: "",
                  assignment: "all",
                })}
              >
                <span>{consultationStatusLabels[status]}</span>
                <strong>
                  {
                    state.consultations.filter((item) => item.status === status)
                      .length
                  }
                </strong>
                <small>View requests</small>
              </Link>
            ))}
          </div>
          <ConsultationFilters area="admin" />
          <p role="status">
            {matches.length} of {state.consultations.length} consultation requests shown
          </p>
          <ol className="qa-list">
            {matches.map((request) => (
              <li key={request.id}>
                <article>
                  <h2>
                    <Link href={href({ consultation: request.id })}>
                      Review {request.id}
                    </Link>
                  </h2>
                  <ConsultationSummary
                    request={publicConsultationSummary(request)}
                    category={state.categoryNames[request.categoryId]}
                  />
                  <p>
                    Assignment:{" "}
                    {state.records.find(
                      (member) => member.id === request.providerId,
                    )?.profile.businessName ?? "Unassigned"}
                  </p>
                  {consultationNeedsAttention(state, request) && (
                    <p className="field-error">
                      Needs admin attention: the assigned member no longer meets
                      category or eligibility rules.
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
          {!matches.length && (
            <div className="workspace-empty">
              <h2>No matching consultation requests</h2>
              <p>
                Clear filters or create a request. Refresh and reset clear session requests.
              </p>
              <Link className="text-link" href="/consultations#request">
                Try the public request form →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdminConsultationDetail({
  request,
}: {
  request: DemoConsultationRequest;
}) {
  const { state, dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `consultation-note:${request.id}`,
  );
  const ready = useDemoReady();
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");
  const feedback = useRef<HTMLParagraphElement>(null);
  const note = useRef<HTMLTextAreaElement>(null);
  const eligible = state.records.filter((member) =>
    canCoordinate(member, request.categoryId),
  );
  function act(action: ConsultationAction) {
    if (!ready) return;
    dispatch(action);
    requestAnimationFrame(() => feedback.current?.focus());
  }
  function confirmChange(result: string): boolean {
    return (
      request.status !== "accepted" ||
      window.confirm(
        `Change this accepted assignment? ${result} No appointment or payment exists.`,
      )
    );
  }
  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const parsed = parseCoordinationNote(draft?.note ?? request.adminNote);
    if (parsed === null) {
      setError("Use no more than 500 characters.");
      note.current?.focus();
      return;
    }
    act({ type: "note-consultation", id: request.id, note: parsed });
    clearDraft();
    setError("");
  }
  return (
    <>
      <article className="panel consultation-detail">
        <h2>Request {request.id}</h2>
        <ConsultationSummary
          request={publicConsultationSummary(request)}
          category={state.categoryNames[request.categoryId]}
        />
        <dl className="consultation-summary">
          <div>
            <dt>Visitor name</dt>
            <dd>{request.name}</dd>
          </div>
          <div>
            <dt>Visitor email</dt>
            <dd>{request.email}</dd>
          </div>
        </dl>
        <h3>Topic</h3>
        <p className="consultation-topic">{request.topic}</p>
        <p>
          Assignment:{" "}
          {state.records.find((member) => member.id === request.providerId)
            ?.profile.businessName ?? "Unassigned"}
        </p>
        {consultationNeedsAttention(state, request) && (
          <p className="field-error">
            Needs admin attention: the assigned member no longer meets category
            or eligibility rules. The record is retained; acceptance is blocked.
          </p>
        )}
        {request.status === "cancelled" ? (
          <p>
            This request is closed. No further assignment actions are available.
          </p>
        ) : (
          <fieldset disabled={!ready} className="member-form-fields">
            <legend>Manage assignment</legend>
            <div className="search-field">
              <label htmlFor="consultation-provider">
                Eligible professional
              </label>
              <select
                id="consultation-provider"
                value={
                  eligible.some((member) => member.id === provider)
                    ? provider
                    : ""
                }
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="">Choose a professional</option>
                {eligible.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.profile.businessName}
                  </option>
                ))}
              </select>
              {!eligible.length && (
                <p>
                  No eligible member matches this category. Eligibility requires
                  approval, an active subscription, no suspension and category
                  membership.
                </p>
              )}
            </div>
            <div className="filter-actions">
              <button
                type="button"
                className="button"
                disabled={
                  !eligible.some((member) => member.id === provider) ||
                  provider === request.providerId
                }
                onClick={() => {
                  if (
                    confirmChange(
                      "The new member must respond; status returns to assigned.",
                    )
                  )
                    act({
                      type: "assign-consultation",
                      id: request.id,
                      providerId: provider,
                      confirmed: true,
                    });
                }}
              >
                {request.providerId
                  ? "Reassign request"
                  : "Assign request"}
              </button>
              {request.providerId && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    if (
                      confirmChange(
                        "The request returns to requested and unassigned.",
                      )
                    )
                      act({
                        type: "unassign-consultation",
                        id: request.id,
                        confirmed: true,
                      });
                  }}
                >
                  Unassign request
                </button>
              )}
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      `Cancel this ${request.status} request? It will be closed. No appointment or payment exists.`,
                    )
                  )
                    act({
                      type: "cancel-consultation",
                      id: request.id,
                      confirmed: true,
                    });
                }}
              >
                Cancel request
              </button>
            </div>
          </fieldset>
        )}
      </article>
      <form className="panel" noValidate onSubmit={saveNote}>
        <fieldset disabled={!ready} className="member-form-fields">
          <legend>Admin-only coordination note</legend>
          <div className="search-field">
            <label htmlFor="consultation-admin-note">
              Internal coordination note (optional)
            </label>
            <textarea
              id="consultation-admin-note"
              ref={note}
              rows={3}
              maxLength={coordinationNoteLimit}
              value={String(draft?.note ?? request.adminNote)}
              onChange={(event) => saveDraft({ note: event.target.value })}
              aria-invalid={!!error}
              aria-describedby="consultation-note-help consultation-note-error"
            />
            <p id="consultation-note-help" className="field-help">
              Plain text only, up to 500 characters. Excluded from member and public summaries. Unsaved notes stay with this request until reset.
            </p>
            <p id="consultation-note-error" className="field-error">
              {error}
            </p>
          </div>
          <button className="button" type="submit">
            Save note
          </button>
        </fieldset>
      </form>
      <p role="status" tabIndex={-1} ref={feedback}>
        {state.notice}
      </p>
    </>
  );
}
