"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  certificationKinds,
  projectCertification,
  type CertificationEntry,
} from "@/domain/editorial";
import {
  parseCertification,
  certificationLimits,
} from "@/validation/admin-editors";
import {
  useDemoDraft,
  useDemoSession,
  useSessionCategories,
} from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { Button } from "@/components/ui/button";

const labels = {
  introduction: "Pathway introduction",
  providerName: "Provider / program name",
  providerUrl: "Provider URL",
  description: "Program description",
  requirements: "Entry requirements",
  steps: "General steps",
  timeline: "Typical timeline",
  costs: "External program costs",
} as const;

function PathwayForm({
  categoryId,
  entry,
}: {
  categoryId: string;
  entry?: CertificationEntry;
}) {
  const { dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `certification:${categoryId}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      noValidate
      onChange={(event) => {
        const data = new FormData(event.currentTarget);
        saveDraft(
          Object.fromEntries(
            [...Object.keys(labels), "kind"].map((key) => [
              key,
              String(data.get(key) ?? ""),
            ]),
          ),
        );
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        const fields = parseCertification(
          Object.fromEntries(new FormData(event.currentTarget)),
        );
        if (!fields) {
          setError(
            "Complete every field within its stated limit. Use an HTTPS provider link without login details, and 1–8 steps of up to 300 characters each.",
          );
          form.current?.querySelector<HTMLElement>("input, textarea")?.focus();
          return;
        }
        dispatch({ type: "save-certification", categoryId, fields });
        clearDraft();
        setError("");
      }}
    >
      <fieldset className="member-form-fields" disabled={!ready}>
        <legend className="sr-only">Certification pathway details</legend>
        <p role="alert" className="field-error" id="certification-error">
          {error}
        </p>
        {Object.entries(labels).map(([rawKey, label]) => {
          const key = rawKey as keyof typeof labels;
          const initial =
            key === "steps" ? entry?.steps.join("\n") : entry?.[key];
          const props = {
            id: `certification-${key}`,
            name: key,
            maxLength: certificationLimits[key],
            defaultValue: String(draft?.[key] ?? initial ?? ""),
            "aria-describedby": `certification-${key}-help certification-error`,
          };
          return (
            <div className="search-field" key={key}>
              <label htmlFor={props.id}>{label}</label>
              <p className="field-help" id={`certification-${key}-help`}>
                {key === "steps"
                  ? "One step per line, up to 8 steps."
                  : `Up to ${certificationLimits[key].toLocaleString("en-US")} characters.`}
              </p>
              {key === "providerName" || key === "providerUrl" ? (
                <input
                  {...props}
                  type={key === "providerUrl" ? "url" : "text"}
                />
              ) : (
                <textarea {...props} rows={key === "steps" ? 5 : 3} />
              )}
            </div>
          );
        })}
        <div className="search-field">
          <label htmlFor="certification-kind">Program type</label>
          <select
            id="certification-kind"
            name="kind"
            defaultValue={String(draft?.kind ?? entry?.kind ?? "")}
          >
            <option value="">Choose program type</option>
            {certificationKinds.map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
        </div>
        <Button type="submit">Save certification draft</Button>
      </fieldset>
    </form>
  );
}

export function CertificationEditor() {
  const { state, dispatch, resetVersion } = useDemoSession();
  const catalog = useSessionCategories();
  const { query, navigate, pending } = useDashboardNavigation("admin");
  const category =
    catalog.find((item) => item.id === query.category) ?? catalog[0];
  const entry = state.certifications.find(
    (item) => item.categoryId === category.id,
  );
  const published = entry ? projectCertification(entry) : null;
  return (
    <div className="admin-management-stack">
      <p className="workspace-note">
        Edit external education references by category. Publishing updates
        Certifications in this tab. It does not verify member claims or certify
        a specialist. Final providers, wording and costs need client approval.
      </p>
      <div className="search-field">
        <label htmlFor="certification-category">Certification category</label>
        <select
          id="certification-category"
          value={category.id}
          disabled={pending}
          onChange={(event) => navigate({ category: event.target.value })}
        >
          {catalog.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <section className="panel admin-management-stack admin-editor-panel">
        <div className="admin-editor-heading">
          <span className="section-tag">{entry?.status ?? "Not started"}</span>
          <h2>{category.name}</h2>
          <p>
            Saving changes returns a published pathway to draft until you
            publish again.
          </p>
        </div>
        <PathwayForm
          key={`${category.id}-${resetVersion}`}
          categoryId={category.id}
          entry={entry}
        />
        {entry && (
          <div className="admin-inline-actions">
            <Button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `${entry.status === "published" ? "Unpublish" : "Publish"} the ${category.name} pathway in this tab?`,
                  )
                )
                  dispatch({
                    type: "publish-certification",
                    categoryId: category.id,
                    published: entry.status !== "published",
                  });
              }}
            >
              {entry.status === "published"
                ? "Return pathway to draft"
                : "Publish pathway"}
            </Button>
            <Link
              className="text-link"
              href={`/education#pathway-${category.id}`}
            >
              View Certifications
            </Link>
          </div>
        )}
      </section>
      {published && (
        <section
          className="panel admin-article-preview"
          data-testid="certification-preview"
        >
          <h2>Published pathway preview</h2>
          <h3>{published.providerName}</h3>
          <p>{published.kind}</p>
          <a
            className="text-link"
            href={published.providerUrl}
            target="_blank"
            rel="noreferrer"
          >
            Provider reference ↗
          </a>
          <p>{published.description}</p>
          <p>{published.introduction}</p>
          <p>{published.requirements}</p>
          <ol>
            {published.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <p>{published.timeline}</p>
          <p>{published.costs}</p>
        </section>
      )}
    </div>
  );
}
