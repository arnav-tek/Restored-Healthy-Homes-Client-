"use client";
import "./connected-categories.css";
import { useState } from "react";
import type { AdminCategories } from "@/domain/admin-categories";
import { formatMonthlyPrice } from "@/domain/categories";
import {
  parseAdminCategories,
  parseCategoryMutation,
} from "@/validation/admin-categories";
import { useDemoReady } from "@/components/ui/use-demo-ready";
type RenameDraft = { name: string; reason: string; version: number };
type NewDraft = {
  id: string;
  name: string;
  description: string;
  monthlyUsd: string;
  billingKey: string;
  reason: string;
  version: number;
};
const endpoint = "/api/admin/categories";
export function ConnectedCategories({ initial }: { initial: AdminCategories }) {
  const ready = useDemoReady();
  const [saved, setSaved] = useState(initial),
    [drafts, setDrafts] = useState<Record<string, RenameDraft>>({}),
    [creation, setCreation] = useState<NewDraft | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function reload() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(endpoint, { cache: "no-store" }),
        d = await r.json();
      if (r.status === 401 || r.status === 403) {
        window.location.replace("/admin");
        return;
      }
      const parsed = parseAdminCategories(d);
      if (!r.ok || !parsed)
        throw Error(
          "Saved categories could not be loaded. Your drafts remain here.",
        );
      setSaved(parsed);
      setMessage(
        "Saved categories reloaded. Your drafts and their original versions are retained for comparison.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Saved categories are unavailable. Drafts retained.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(raw: unknown, id?: string) {
    if (!ready || busy) return;
    const mutation = parseCategoryMutation(raw);
    if (!mutation) {
      setError(
        "Check the name (3–80 characters), reason (3–300), and explicit new-category configuration. Your draft is retained.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(endpoint, {
        method: mutation.action === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mutation),
      });
      const d = await r.json();
      if (r.status === 401 || r.status === 403) {
        window.location.replace("/admin");
        return;
      }
      if (!r.ok)
        throw Error(d.error ?? "Saving failed. Your draft is retained.");
      const parsed = parseAdminCategories(d);
      if (!parsed || d.saved !== true)
        throw Error(
          "Saving could not be confirmed. Compare saved categories before retrying.",
        );
      setSaved(parsed);
      if (id)
        setDrafts((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      else setCreation(null);
      setMessage(
        d.unchanged === true
          ? "This category name is already saved; no change was made."
          : mutation.action === "create"
            ? "Category created. Its configuration does not activate billing."
            : "Category name saved. IDs, prices and linked records are unchanged.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Saving could not be confirmed. Your draft is retained.",
      );
    } finally {
      setBusy(false);
    }
  }
  const create = creation ?? {
    id: "",
    name: "",
    description: "",
    monthlyUsd: "",
    billingKey: "",
    reason: "",
    version: saved.version,
  };
  return (
    <div
      className="admin-management-stack connected-categories"
      aria-busy={busy}
    >
      <p>
        Changes are saved to the category catalog. Existing IDs, billing keys
        and prices are read-only. Renaming preserves linked listings, questions,
        consultations and memberships.
      </p>
      <p>
        New categories require an explicit ID, description, monthly USD
        configuration and billing key. No billing is activated here;
        combined-category billing remains undecided. Up to 32 categories are
        supported.
      </p>
      <p>
        Deactivation and deletion are unavailable here. Existing inactive
        categories remain attached to saved profiles but are unavailable for new
        application selections.
      </p>
      <noscript>
        JavaScript is required to save category changes. These forms cannot save
        without it.
      </noscript>
      <button
        type="button"
        className="button button-secondary"
        disabled={busy || !ready}
        onClick={reload}
      >
        Reload saved categories, keep drafts
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {(busy || message) && (
        <p role="status" className="session-status">
          {busy ? "Saving or loading categories…" : message}
        </p>
      )}
      <section className="panel admin-editor-panel">
        <h2>Create a category</h2>
        <form
          method="post"
          action={endpoint}
          onSubmit={(e) => {
            e.preventDefault();
            void save({
              ...create,
              action: "create",
              monthlyUsd: Number(create.monthlyUsd),
            });
          }}
        >
          <fieldset className="member-form-fields" disabled={!ready || busy}>
            <legend>Explicit new-category configuration</legend>
            {(
              [
                ["id", "Stable category ID", 80],
                ["name", "New category name", 80],
                ["description", "Category description", 300],
                ["monthlyUsd", "New category monthly configuration (USD)", 5],
                ["billingKey", "New category billing key", 80],
                ["reason", "Reason for creation", 300],
              ] as const
            ).map(([field, label, max]) => (
              <div className="search-field" key={field}>
                <label htmlFor={`create-category-${field}`}>{label}</label>
                {field === "description" || field === "reason" ? (
                  <textarea
                    id={`create-category-${field}`}
                    name={field}
                    value={create[field]}
                    maxLength={max}
                    rows={3}
                    onChange={(e) =>
                      setCreation({ ...create, [field]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    id={`create-category-${field}`}
                    name={field}
                    value={create[field]}
                    maxLength={max}
                    inputMode={field === "monthlyUsd" ? "numeric" : undefined}
                    onChange={(e) =>
                      setCreation({ ...create, [field]: e.target.value })
                    }
                  />
                )}
              </div>
            ))}
            <p className="field-help">
              IDs: 2–80 lowercase letters, digits or hyphens, starting with a
              letter. Billing keys also permit underscores. Monthly
              configuration: a whole-dollar amount from 1 to 10,000, explicitly
              agreed for this category.
            </p>
            {creation && creation.version !== saved.version && (
              <div className="notice">
                <p>
                  This draft uses catalog version {creation.version}; the saved
                  catalog is version {saved.version}. Compare saved categories
                  before retrying.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setCreation({ ...creation, version: saved.version })
                  }
                >
                  Use current saved version, keep new category draft
                </button>
              </div>
            )}
            <button className="button" type="submit">
              {busy ? "Saving…" : "Create category"}
            </button>
            <button
              className="text-link"
              type="button"
              onClick={() => setCreation(null)}
            >
              Discard new category draft
            </button>
          </fieldset>
        </form>
      </section>
      <section className="admin-management-stack" aria-label="Saved categories">
        <h2>Saved categories</h2>
        {saved.items.map((c) => {
          const draft = drafts[c.id],
            value = draft ?? {
              name: c.name,
              reason: "",
              version: saved.version,
            };
          return (
            <article className="panel admin-editor-panel" key={c.id}>
              <h3>{c.name}</h3>
              <p className="field-help">
                ID: {c.id} · {formatMonthlyPrice(c.monthlyUsd)} USD/month ·
                Billing key: {c.billingKey} ·{" "}
                {c.active ? "Available" : "Unavailable for new selection"}
              </p>
              <form
                method="post"
                action={endpoint}
                onSubmit={(e) => {
                  e.preventDefault();
                  void save({ action: "rename", id: c.id, ...value }, c.id);
                }}
              >
                <fieldset
                  className="member-form-fields"
                  disabled={!ready || busy}
                >
                  <legend>Rename {c.name}</legend>
                  <label htmlFor={`category-name-${c.id}`}>Category name</label>
                  <input
                    id={`category-name-${c.id}`}
                    name="name"
                    value={value.name}
                    maxLength={80}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [c.id]: { ...value, name: e.target.value },
                      }))
                    }
                  />
                  <label htmlFor={`category-reason-${c.id}`}>
                    Reason for rename
                  </label>
                  <textarea
                    id={`category-reason-${c.id}`}
                    name="reason"
                    value={value.reason}
                    rows={2}
                    maxLength={300}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [c.id]: { ...value, reason: e.target.value },
                      }))
                    }
                  />
                  {draft && draft.version !== saved.version && (
                    <div className="notice">
                      <p>
                        Saved name: {c.name}. Your draft uses version{" "}
                        {draft.version}; saved catalog version is{" "}
                        {saved.version}.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((current) => ({
                            ...current,
                            [c.id]: { ...value, version: saved.version },
                          }))
                        }
                      >
                        Use current saved version, keep rename draft
                      </button>
                    </div>
                  )}
                  <button className="button" type="submit">
                    {busy ? "Saving…" : "Save category name"}
                  </button>
                </fieldset>
              </form>
            </article>
          );
        })}
      </section>
      <details>
        <summary>Recent category changes ({saved.history.length})</summary>
        {saved.history.length ? (
          saved.history.map((h) => (
            <article key={h.id}>
              <p>
                {h.action} · {h.categoryId} · Version {h.version}
              </p>
              <p>
                {h.previousName ? `${h.previousName} → ` : ""}
                {h.name}
              </p>
              <p>{h.reason}</p>
              <p>
                {h.at} · Administrator {h.actorId}
              </p>
            </article>
          ))
        ) : (
          <p>No category changes have been recorded.</p>
        )}
      </details>
    </div>
  );
}
