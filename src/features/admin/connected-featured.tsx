"use client";
import { useState } from "react";
import type {
  FeaturedItem,
  FeaturedView,
  FeaturedWorkspace,
} from "@/domain/admin-operations";
import {
  parseOperationsInput,
  projectFeatured,
} from "@/validation/admin-operations";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import "./connected-operations.css";
type Draft = { selected: boolean; reason: string; version: number };
export function ConnectedFeatured({ initial }: { initial: FeaturedWorkspace }) {
  const ready = useDemoReady(),
    [saved, setSaved] = useState(initial),
    [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function request(
    view: FeaturedView,
    page: number,
    payload?: Record<string, unknown>,
  ) {
    const r = await fetch(
        `/api/admin/featured${payload ? "" : `?${new URLSearchParams({ view, page: String(page) })}`}`,
        {
          method: payload ? "POST" : "GET",
          cache: "no-store",
          ...(payload
            ? {
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              }
            : {}),
        },
      ),
      raw = await r.json();
    if (r.status === 401 || r.status === 403) {
      window.location.replace("/admin");
      throw Error("Current administrator access is required.");
    }
    const next = projectFeatured(raw);
    if (!r.ok || !next || (payload && raw.saved !== true))
      throw Error(
        typeof raw.error === "string"
          ? raw.error
          : "Saved selections are unavailable. Your drafts remain here.",
      );
    return { ...next, unchanged: raw.unchanged === true };
  }
  async function reload(view = saved.view, page = saved.page) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setSaved(await request(view, page));
      setMessage(
        "Saved selections reloaded. Local drafts and their original versions are retained for comparison.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Selections unavailable. Drafts retained.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(item: FeaturedItem, draft: Draft) {
    if (!ready || busy) return;
    const input = parseOperationsInput({
      action: "set_featured",
      view: saved.view,
      page: saved.page,
      id: item.id,
      selected: draft.selected,
      reason: draft.reason,
      version: draft.version,
    });
    if (!input) {
      setError(
        "Enter a reason of 3–300 characters and use the saved selection version. Your draft is retained.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await request(saved.view, saved.page, input);
      setSaved(next);
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[item.id];
        return copy;
      });
      setMessage(
        next.unchanged
          ? "The editorial selection is already saved; no change was made."
          : "Editorial selection saved. Membership, entitlement, approval and credentials were not changed.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Saving failed. Your draft is retained.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="connected-operations admin-management-stack"
      aria-busy={busy}
    >
      <p>
        Editorial selections are separate from recorded featured entitlements.
        These controls do not activate membership, grant paid placement or
        verify credentials. Only approved listings with active membership and no
        suspension can appear publicly. Names and IDs determine display order;
        no ranking is promised.
      </p>
      <p role="status">{busy ? "Loading…" : message}</p>
      <p role="alert" className="field-error">
        {error}
      </p>
      <noscript>
        Enable JavaScript to manage editorial selections. No changes can be
        submitted without it.
      </noscript>
      <fieldset className="member-form-fields" disabled={!ready || busy}>
        <legend className="sr-only">Featured views</legend>
        <div className="admin-inline-actions">
          {(
            [
              ["selected", "Editorial selections"],
              ["eligible", "Eligible candidates"],
              ["entitled", "Recorded entitlements"],
            ] as const
          ).map(([view, label]) => (
            <button
              type="button"
              className="button button-secondary"
              key={view}
              aria-pressed={saved.view === view}
              onClick={() => void reload(view, 1)}
            >
              {label}
            </button>
          ))}
          <button
            className="text-link"
            type="button"
            onClick={() => void reload()}
          >
            Reload saved selections
          </button>
        </div>
      </fieldset>
      {saved.view === "entitled" && (
        <p>
          Recorded featured entitlement is read only here. Removing an editorial
          selection does not remove entitlement-based placement.
        </p>
      )}
      <p>
        {saved.total}{" "}
        {saved.view === "selected"
          ? "editorial selections"
          : saved.view === "eligible"
            ? "eligible candidates"
            : "recorded entitlements"}
        . Page {saved.page}.
      </p>
      <div className="admin-management-grid">
        {saved.items.map((item) => {
          const d = drafts[item.id] ?? {
            selected: item.selected,
            version: item.version,
            reason: "",
          };
          const edit = (patch: Partial<Draft>) =>
            setDrafts((all) => ({ ...all, [item.id]: { ...d, ...patch } }));
          return (
            <article className="panel admin-management-card" key={item.id}>
              <h2>{item.businessName}</h2>
              <p>
                {item.approval} · Membership: {item.membership ?? "no record"} ·{" "}
                {item.suspended ? "Suspended" : "No suspension"}
              </p>
              <p>
                Recorded featured entitlement: {item.entitlement} (read only).
              </p>
              <p>
                Saved editorial selection:{" "}
                {item.selected ? "selected" : "not selected"}.{" "}
                {item.visible
                  ? "Currently eligible for public featured display."
                  : "Not currently visible in public featured sections."}
              </p>
              {item.selected && !item.eligible && (
                <p>
                  The editorial selection is retained while this listing is
                  ineligible; it is hidden publicly.
                </p>
              )}
              <form
                method="post"
                action="/api/admin/featured"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(item, d);
                }}
              >
                <fieldset
                  className="member-form-fields"
                  disabled={!ready || busy}
                >
                  <legend className="sr-only">
                    Editorial selection for {item.businessName}
                  </legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={d.selected}
                      disabled={!item.eligible && !item.selected}
                      onChange={(e) => edit({ selected: e.target.checked })}
                    />
                    Select for editorial placement
                  </label>
                  <label htmlFor={`editorial-reason-${item.id}`}>
                    Reason (admin only)
                  </label>
                  <textarea
                    id={`editorial-reason-${item.id}`}
                    name="reason"
                    value={d.reason}
                    maxLength={300}
                    rows={3}
                    onChange={(e) => edit({ reason: e.target.value })}
                  />
                  <button type="submit" className="button">
                    Save editorial selection
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      setDrafts((all) => {
                        const copy = { ...all };
                        delete copy[item.id];
                        return copy;
                      })
                    }
                  >
                    Discard this local draft
                  </button>
                  {d.version !== item.version && (
                    <>
                      <p role="alert">
                        Your draft uses version {d.version}; saved version{" "}
                        {item.version} is{" "}
                        {item.selected ? "selected" : "not selected"}. Compare
                        before retrying.
                      </p>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => edit({ version: item.version })}
                      >
                        Keep my draft against the reloaded version
                      </button>
                    </>
                  )}
                </fieldset>
              </form>
            </article>
          );
        })}
      </div>
      {!saved.items.length && (
        <p>
          No records in this view/page. Choose eligible candidates or return to
          an earlier page. Empty results do not activate memberships or
          entitlements.
        </p>
      )}
      <nav aria-label="Featured pages" className="admin-inline-actions">
        <button
          className="button button-secondary"
          disabled={!ready || busy || saved.page <= 1}
          type="button"
          onClick={() => void reload(saved.view, saved.page - 1)}
        >
          Previous
        </button>
        <button
          className="button button-secondary"
          disabled={!ready || busy || saved.page * 20 >= saved.total}
          type="button"
          onClick={() => void reload(saved.view, saved.page + 1)}
        >
          Next
        </button>
      </nav>
      <details>
        <summary>Recent editorial action history</summary>
        {saved.history.length ? (
          saved.history.map((h) => (
            <p key={h.id}>
              Listing {h.professionalId} · version {h.version} ·{" "}
              {h.selected ? "selected" : "removed"} · {h.at} · administrator{" "}
              {h.actorId} · {h.reason}
            </p>
          ))
        ) : (
          <p>No editorial changes recorded.</p>
        )}
      </details>
    </div>
  );
}
