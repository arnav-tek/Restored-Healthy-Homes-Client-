"use client";
import { useState } from "react";
import {
  contentFields,
  contentKinds,
  contentLabels,
  emptyContent,
  type ContentKind,
  type ContentFields,
  type ContentWorkspace,
} from "@/domain/site-content";
import {
  parseContentFields,
  parseContentMutation,
  projectContentWorkspace,
} from "@/validation/site-content";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { resourceCategories } from "@/domain/resource";
import { certificationKinds } from "@/domain/editorial";
import { ContentPreview } from "@/features/content/content-preview";
import "./connected-categories.css";
import "./connected-content.css";
type Draft = { fields: ContentFields; version: number; reason: string };
export function ConnectedContent({
  initial,
  categories,
}: {
  initial: ContentWorkspace;
  categories: readonly { id: string; name: string }[];
}) {
  const ready = useDemoReady(),
    [saved, setSaved] = useState(initial),
    [selected, setSelected] = useState<string | null>(
      initial.items.length === 1 && initial.history.length
        ? initial.items[0].id
        : null,
    ),
    [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [kind, setKind] = useState<ContentKind>("resource"),
    [key, setKey] = useState(""),
    [creation, setCreation] = useState<ContentFields>(emptyContent("resource")),
    [createReason, setCreateReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [approved, setApproved] = useState(false),
    [previewed, setPreviewed] = useState<number | null>(null);
  const doc = saved.items.find((d) => d.id === selected),
    draft = doc
      ? (drafts[doc.id] ?? {
          fields: doc.fields,
          version: doc.version,
          reason: "",
        })
      : null;
  const dirty =
    !!doc &&
    !!draft &&
    (JSON.stringify(draft.fields) !== JSON.stringify(doc.fields) ||
      draft.version !== doc.version);
  function edit(patch: Partial<Draft>) {
    if (doc && draft)
      setDrafts((d) => ({ ...d, [doc.id]: { ...draft, ...patch } }));
  }
  async function request(
    payload?: Record<string, unknown>,
    record?: string,
    page = 1,
  ) {
    const query = new URLSearchParams({ page: String(page) });
    if (record) query.set("record", record);
    const r = await fetch(`/api/admin/content${payload ? "" : `?${query}`}`, {
        method: payload ? "POST" : "GET",
        cache: "no-store",
        ...(payload
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            }
          : {}),
      }),
      raw = await r.json();
    if (r.status === 401 || r.status === 403) {
      window.location.replace("/admin");
      throw Error("Current administrator access is required.");
    }
    const projected = projectContentWorkspace(raw);
    if (!r.ok || !projected || (payload && raw.saved !== true))
      throw Error(
        typeof raw.error === "string"
          ? raw.error
          : "Saved content is unavailable. Your draft is retained.",
      );
    return { ...projected, unchanged: raw.unchanged === true };
  }
  async function load(record?: string, page = 1) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setPreviewed(null);
    setApproved(false);
    try {
      const next = await request(undefined, record, page);
      setSaved(next);
      setSelected(record ?? null);
      setNotice(
        "Saved content reloaded. Local drafts and their original versions are retained for comparison.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Content unavailable. Draft retained.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(action: "create" | "save" | "publish" | "unpublish") {
    if (!ready || busy) return;
    const raw =
      action === "create"
        ? {
            action,
            kind,
            key: kind === "resource" || kind === "pathway" ? key : kind,
            fields: creation,
            reason: createReason,
          }
        : doc && draft
          ? {
              action,
              id: doc.id,
              kind: doc.kind,
              version: draft.version,
              reason: draft.reason,
              ...(action === "save"
                ? { fields: draft.fields }
                : action === "publish"
                  ? { approved }
                  : {}),
            }
          : null;
    const input = parseContentMutation(raw);
    if (
      !input ||
      (action === "publish" &&
        (!doc ||
          dirty ||
          previewed !== doc.version ||
          !parseContentFields(doc.kind, doc.fields, true)))
    ) {
      setError(
        "Check the fields, saved version and reason (3–300 characters). Save and preview complete client-approved copy before publishing. Your draft is retained.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await request(input),
        row = next.items[0];
      if (!row)
        throw Error("Saving could not be confirmed. Reload before retrying.");
      setSaved(next);
      setSelected(row.id);
      setPreviewed(null);
      setApproved(false);
      setDrafts((prev) => ({
        ...prev,
        [row.id]: {
          fields: action === "unpublish" && draft ? draft.fields : row.fields,
          version: row.version,
          reason: "",
        },
      }));
      if (action === "create") {
        setCreation(emptyContent(kind));
        setKey("");
        setCreateReason("");
      }
      setNotice(
        next.unchanged
          ? "Already saved; no change was made."
          : action === "publish"
            ? "Saved version published."
            : action === "unpublish"
              ? "Content unpublished. The draft is retained."
              : "Draft saved. The published version has not changed.",
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
  function fieldsForm(
    k: ContentKind,
    fields: ContentFields,
    set: (fields: ContentFields) => void,
  ) {
    return Object.entries(contentFields[k]).map(([name, [label, maximum]]) => (
      <div className="search-field" key={name}>
        <label htmlFor={`content-${name}`}>{label}</label>
        {name === "category" || name === "kind" ? (
          <select
            id={`content-${name}`}
            value={fields[name]}
            onChange={(e) => set({ ...fields, [name]: e.target.value })}
          >
            <option value="">Select an option</option>
            {(name === "category"
              ? resourceCategories.map((c) => ({ value: c.id, label: c.label }))
              : certificationKinds.map((c) => ({ value: c, label: c }))
            ).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        ) : (
          <textarea
            id={`content-${name}`}
            name={name}
            rows={maximum > 2000 ? 8 : 2}
            value={fields[name]}
            maxLength={maximum}
            onChange={(e) => set({ ...fields, [name]: e.target.value })}
          />
        )}
        <span className="field-help">
          Up to {maximum.toLocaleString("en-US")} characters.
        </span>
      </div>
    ));
  }
  return (
    <div className="connected-content admin-management-stack" aria-busy={busy}>
      <p>
        Save drafts, review the saved preview, then publish explicitly. Draft
        edits leave the current published version unchanged. Plain text supports
        paragraphs and headings beginning with “## ”; HTML is displayed as text.
      </p>
      <p role="status">{busy ? "Loading…" : notice}</p>
      <p role="alert" className="field-error">
        {error}
      </p>
      <noscript>
        Enable JavaScript to use this protected editor. No changes can be
        submitted without it.
      </noscript>
      <fieldset disabled={!ready || busy} className="member-form-fields">
        <legend className="sr-only">Content navigation</legend>
        <div className="admin-inline-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void load()}
          >
            All content
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setSelected("new");
              setError("");
              setNotice("");
            }}
          >
            Create content
          </button>
          {doc && (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void load(doc.id)}
            >
              Reload saved version; keep my draft
            </button>
          )}
        </div>
      </fieldset>
      {selected === "new" ? (
        <form
          method="post"
          action="/api/admin/content"
          onSubmit={(e) => {
            e.preventDefault();
            void save("create");
          }}
        >
          <fieldset disabled={!ready || busy} className="member-form-fields">
            <legend>Create content draft</legend>
            <label htmlFor="content-type">Content type</label>
            <select
              id="content-type"
              value={kind}
              onChange={(e) => {
                const k = e.target.value as ContentKind;
                setKind(k);
                setCreation(emptyContent(k));
                setKey("");
              }}
            >
              {contentKinds.map((k) => (
                <option key={k} value={k}>
                  {contentLabels[k]}
                </option>
              ))}
            </select>
            {kind === "resource" ? (
              <div className="search-field">
                <label htmlFor="content-key">Permanent resource URL slug</label>
                <input
                  id="content-key"
                  value={key}
                  maxLength={100}
                  onChange={(e) => setKey(e.target.value)}
                />
                <p className="field-help">
                  Lowercase letters/numbers with hyphens. This URL cannot be
                  renamed.
                </p>
              </div>
            ) : kind === "pathway" ? (
              <div className="search-field">
                <label htmlFor="content-key">Category</label>
                <select
                  id="content-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                >
                  <option value="">Choose category</option>
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {fieldsForm(kind, creation, setCreation)}
            <label htmlFor="create-reason">Reason (admin only)</label>
            <textarea
              id="create-reason"
              value={createReason}
              maxLength={300}
              onChange={(e) => setCreateReason(e.target.value)}
            />
            <button className="button" type="submit">
              Save new draft
            </button>
          </fieldset>
        </form>
      ) : doc && draft ? (
        <>
          <h2>
            {contentLabels[doc.kind]} · {doc.key}
          </h2>
          <p>
            Saved version {doc.version}.{" "}
            {doc.published
              ? `Published version ${doc.publishedVersion} remains public.`
              : "Unpublished."}
          </p>
          {doc.kind === "about" && (
            <p>
              Client story, why and approved professional video assets are
              required. Video metadata accepts only /media/client/filename.mp4
              or .webm, poster .jpg/.png/.webp and English captions .vtt. Supply
              assets separately; a video requires captions and a transcript. No
              iframe markup.
            </p>
          )}
          {doc.kind === "pathway" && (
            <p>
              External provider education only. This does not issue
              certifications or alter listing badges. Confirm provider
              information, costs and timelines before publication.
            </p>
          )}
          {["terms", "privacy", "disclaimer"].includes(doc.kind) && (
            <p>
              Use only client-supplied legal wording approved for this page.
              This editor does not generate legal policies.
            </p>
          )}
          <form
            method="post"
            action="/api/admin/content"
            onSubmit={(e) => {
              e.preventDefault();
              void save("save");
            }}
          >
            <fieldset disabled={!ready || busy} className="member-form-fields">
              <legend>Edit draft</legend>
              {fieldsForm(doc.kind, draft.fields, (f) => edit({ fields: f }))}
              <label htmlFor="content-reason">Reason (admin only)</label>
              <textarea
                id="content-reason"
                value={draft.reason}
                maxLength={300}
                onChange={(e) => edit({ reason: e.target.value })}
              />
              <button className="button" type="submit">
                Save draft
              </button>
              {draft.version !== doc.version && (
                <>
                  <p role="alert">
                    Your draft uses version {draft.version}. Compare it with
                    saved version {doc.version} below.
                  </p>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => edit({ version: doc.version })}
                  >
                    Keep my draft against the reloaded version
                  </button>
                </>
              )}
            </fieldset>
          </form>
          <details
            key={`${doc.id}-${doc.version}`}
            onToggle={(e) => {
              if (e.currentTarget.open) setPreviewed(doc.version);
            }}
          >
            <summary>Preview saved draft (administrator only)</summary>
            <ContentPreview
              content={{ kind: doc.kind, key: doc.key, fields: doc.fields }}
            />
          </details>
          {doc.published && (
            <details>
              <summary>Compare currently published version</summary>
              <ContentPreview content={doc.published} />
            </details>
          )}
          <form
            method="post"
            action="/api/admin/content"
            onSubmit={(e) => {
              e.preventDefault();
              void save("publish");
            }}
          >
            <fieldset disabled={!ready || busy} className="member-form-fields">
              <legend>Publication decision</legend>
              <label>
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                />{" "}
                I have client approval for this copy, links and assets.
              </label>
              <p>
                Publishing uses the saved preview. Save unsaved changes first.
                The reason above is recorded privately.
              </p>
              <button
                className="button button-secondary"
                type="submit"
                disabled={dirty || !approved || previewed !== doc.version}
              >
                Publish saved version
              </button>
              {doc.published && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Unpublish this content? Its public URL will no longer show the content.",
                      )
                    )
                      void save("unpublish");
                  }}
                >
                  Unpublish
                </button>
              )}
            </fieldset>
          </form>
          <details>
            <summary>Publication and draft history</summary>
            {saved.history.map((h) => (
              <p key={h.id}>
                Version {h.version} · {h.action} · {h.at} · {h.reason}
              </p>
            ))}
          </details>
        </>
      ) : selected ? (
        <p>Saved content is unavailable. Return to all content.</p>
      ) : (
        <>
          <div className="admin-management-grid">
            {saved.items.map((item) => (
              <article className="panel admin-management-card" key={item.id}>
                <p className="section-tag">
                  {contentLabels[item.kind]} ·{" "}
                  {item.published ? "Published" : "Draft"}
                </p>
                <h2>
                  {item.fields.title || item.fields.providerName || item.key}
                </h2>
                <p>{item.key}</p>
                <button
                  className="button button-secondary"
                  disabled={!ready || busy}
                  type="button"
                  onClick={() => void load(item.id)}
                >
                  Edit and preview
                </button>
              </article>
            ))}
          </div>
          {!saved.items.length && (
            <p>
              No saved content yet. Client copy and assets are still needed.
            </p>
          )}
          <nav aria-label="Content pages">
            <button
              className="button button-secondary"
              disabled={!ready || busy || saved.page <= 1}
              type="button"
              onClick={() => void load(undefined, saved.page - 1)}
            >
              Previous
            </button>
            <span> Page {saved.page} </span>
            <button
              className="button button-secondary"
              disabled={!ready || busy || saved.page * 20 >= saved.total}
              type="button"
              onClick={() => void load(undefined, saved.page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
