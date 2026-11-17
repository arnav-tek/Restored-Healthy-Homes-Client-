"use client";
import "./connected-consultations.css";
import Link from "next/link";
import { useRef, useState } from "react";
import type {
  ConsultationItem,
  ConsultationWorkspace,
} from "@/domain/connected-consultations";
import { consultationStatusLabels } from "@/domain/consultation";
import { parseConsultationWorkspace } from "@/validation/connected-consultations";
type Draft = {
  note?: { value: string; version: number };
  professionalId?: { value: string; version: number };
};

/** The server keys this workspace by authenticated identity/scope, never by page.
 * Drafts stay here across query navigation, attached to their original record/version.
 */
export function ConnectedConsultationWorkspace({
  initial,
  admin,
  initialError = "",
}: {
  initial: ConsultationWorkspace;
  admin: boolean;
  initialError?: string;
}) {
  const [snapshot, setSnapshot] = useState({
    source: initial,
    data: initial,
    error: initialError,
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const sequence = useRef(0);
  // New server props select the current page synchronously, without dropping drafts.
  if (snapshot.source !== initial)
    setSnapshot({ source: initial, data: initial, error: initialError });
  const data = snapshot.source === initial ? snapshot.data : initial;
  const endpoint = `/api/${admin ? "admin" : "member"}/consultations`;
  function updateDraft(id: string, update: (previous: Draft) => Draft) {
    setDrafts((previous) => ({
      ...previous,
      [id]: update(previous[id] ?? {}),
    }));
  }
  async function refresh() {
    const source = initial,
      request = ++sequence.current;
    try {
      const response = await fetch(`${endpoint}?page=${source.page}`, {
        cache: "no-store",
      });
      const result = await response.json();
      const parsed = parseConsultationWorkspace(result, admin);
      if (!response.ok || !parsed || parsed.page !== source.page)
        throw Error(
          result.error ??
            "Saved requests could not be loaded. Your drafts remain here.",
        );
      setSnapshot((current) =>
        current.source === source && request === sequence.current
          ? { source, data: parsed, error: "" }
          : current,
      );
    } catch (e) {
      const error =
        e instanceof Error ? e.message : "Saved requests could not be loaded.";
      setSnapshot((current) =>
        current.source === source && request === sequence.current
          ? { ...current, error }
          : current,
      );
      throw Error(error);
    }
  }
  return (
    <div className="consultation-workspace connected-consultations">
      <p>
        {admin
          ? "Assign opted-in specialists in the requested category. Contact details and coordination notes stay admin-only."
          : "Only requests currently assigned to your owned listing appear here. Acceptance means willingness to coordinate, not an appointment."}
      </p>
      <p>
        Automatic email notifications are not enabled. Refresh this workspace to
        see saved changes.
      </p>
      {admin && (
        <p>
          Unsaved choices stay with each request while browsing pages in this
          signed-in workspace. Compare saved values after a conflict before
          using the current version.
        </p>
      )}
      <button onClick={() => void refresh().catch(() => {})}>
        Refresh saved requests
      </button>
      {snapshot.error && <p role="alert">{snapshot.error}</p>}
      {!snapshot.error && !data.items.length && (
        <p className="workspace-empty">
          No consultation requests on this page.
        </p>
      )}
      <div className="consultation-cards-list">
        {data.items.map((item) => (
          <ConsultationCard
            key={item.id}
            item={item}
            draft={drafts[item.id] ?? {}}
            update={(fn) => updateDraft(item.id, fn)}
            candidates={data.candidates}
            admin={admin}
            endpoint={endpoint}
            refresh={refresh}
          />
        ))}
      </div>
      <nav className="admin-inline-actions" aria-label="Consultation pages">
        {data.page > 1 && <Link href={`?page=${data.page - 1}`}>Previous</Link>}
        <span>Page {data.page}</span>
        {data.hasNext && <Link href={`?page=${data.page + 1}`}>Next</Link>}
      </nav>
    </div>
  );
}
function ConsultationCard({
  item,
  draft,
  update,
  candidates,
  admin,
  endpoint,
  refresh,
}: {
  item: ConsultationItem;
  draft: Draft;
  update: (fn: (previous: Draft) => Draft) => void;
  candidates: ConsultationWorkspace["candidates"];
  admin: boolean;
  endpoint: string;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState(false);
  const note = draft.note?.value ?? item.note ?? "",
    professionalId = draft.professionalId?.value ?? item.professionalId ?? "";
  const stale = Object.values(draft).some(
    (field) => field.version !== item.version,
  );
  async function act(action: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const version =
      action === "note"
        ? (draft.note?.version ?? item.version)
        : action === "assign"
          ? (draft.professionalId?.version ?? item.version)
          : item.version;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          version,
          action,
          ...(action === "assign"
            ? { professionalId }
            : action === "note"
              ? { note }
              : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error);
        return;
      }
      if (result.saved !== true) throw Error();
      await refresh();
      // A different field's draft retains its original version for conflict review.
      if (action === "note" || action === "assign")
        update((previous) => {
          const next = { ...previous };
          const field = action === "note" ? "note" : "professionalId";
          if (
            next[field]?.version === version &&
            next[field]?.value === (action === "note" ? note : professionalId)
          )
            delete next[field];
          return next;
        });
      setMessage("Saved.");
      setConfirm(false);
    } catch {
      setMessage(
        "Save or refresh could not be confirmed. Your draft is retained; refresh saved requests before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  const selectedName =
    candidates.find((c) => c.id === item.professionalId)?.name ??
    (item.professionalId
      ? "Previously assigned specialist (currently unavailable)"
      : "Unassigned");
  return (
    <article className="consultation-record-card">
      <h2>{consultationStatusLabels[item.status]}</h2>
      <p>Category: {item.categoryName??item.categoryId}</p>
      <p className="consultation-topic">{item.topic}</p>
      <p>
        Requested{" "}
        {new Date(item.createdAt).toLocaleDateString("en-US", {
          timeZone: "UTC",
        })}
      </p>
      {admin && (
        <>
          <p>
            {item.name} · {item.email}
          </p>
          <p>Assigned specialist: {selectedName}</p>
          <label>
            Private coordination note
            <textarea
              value={note}
              maxLength={500}
              disabled={busy}
              onChange={(e) => {
                const value = e.target.value;
                update((previous) => ({
                  ...previous,
                  note: {
                    value,
                    version: previous.note?.version ?? item.version,
                  },
                }));
              }}
            />
          </label>
          <button disabled={busy} onClick={() => void act("note")}>
            Save note
          </button>
          {stale && (
            <div className="notice">
              <p>
                Saved version {item.version}. Saved private note:{" "}
                {item.note || "None"}. Saved specialist: {selectedName}. Your
                draft still uses its earlier saved version.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  update((previous) => ({
                    ...previous,
                    ...(previous.note
                      ? { note: { ...previous.note, version: item.version } }
                      : {}),
                    ...(previous.professionalId
                      ? {
                          professionalId: {
                            ...previous.professionalId,
                            version: item.version,
                          },
                        }
                      : {}),
                  }))
                }
              >
                Use current saved version, keep draft
              </button>
            </div>
          )}
        </>
      )}
      {item.status !== "cancelled" &&
        (admin ? (
          <>
            <label>
              Participating specialist
              <select
                value={professionalId}
                disabled={busy}
                onChange={(e) => {
                  const value = e.target.value;
                  update((previous) => ({
                    ...previous,
                    professionalId: {
                      value,
                      version: previous.professionalId?.version ?? item.version,
                    },
                  }));
                }}
              >
                <option value="">Choose a specialist</option>
                {candidates
                  .filter((c) => c.categoryIds.includes(item.categoryId))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="admin-inline-actions">
              <button
                disabled={busy || !professionalId}
                onClick={() => void act("assign")}
              >
                {item.professionalId ? "Reassign" : "Assign"}
              </button>
              <button disabled={busy} onClick={() => setConfirm(true)}>
                Cancel request
              </button>
            </div>
            {confirm && (
              <div role="group" aria-label="Confirm cancellation">
                <p>Cancel this request?</p>
                <button disabled={busy} onClick={() => void act("cancel")}>
                  Confirm cancellation
                </button>
                <button disabled={busy} onClick={() => setConfirm(false)}>
                  Keep request
                </button>
              </div>
            )}
          </>
        ) : item.status === "assigned" ? (
          <div className="admin-inline-actions">
            <button disabled={busy} onClick={() => void act("accept")}>
              Accept for coordination
            </button>
            <button disabled={busy} onClick={() => void act("decline")}>
              Decline assignment
            </button>
          </div>
        ) : null)}
      {message && <p role="status">{message}</p>}
    </article>
  );
}
