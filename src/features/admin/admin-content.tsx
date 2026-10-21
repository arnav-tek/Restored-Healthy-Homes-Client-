"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { AdminArticle } from "@/domain/admin-showcase";
import { resourceCategories } from "@/domain/resource";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import { parseAdminArticle } from "@/validation/admin-showcase";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { Button } from "@/components/ui/button";

function ArticleEditor({ article }: { article?: AdminArticle }) {
  const { dispatch } = useDemoSession();
  const { navigate } = useDashboardNavigation("admin");
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `admin-content:${article?.id ?? "new"}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const title = useRef<HTMLInputElement>(null);
  const values = {
    title: "",
    category: "planning",
    summary: "",
    body: "",
    ...article,
    ...draft,
  };
  return (
    <section className="panel admin-management-stack admin-editor-panel">
      <div className="admin-editor-heading">
        <h2>{article ? "Edit resource" : "Create a resource"}</h2>
        <p>
          Saving returns the article to draft. Review the saved preview before
          publishing to this showcase.
        </p>
      </div>
      <form
        noValidate
        onChange={(event) => {
          const data = new FormData(event.currentTarget);
          saveDraft(
            Object.fromEntries(
              ["title", "category", "summary", "body"].map((key) => [
                key,
                String(data.get(key) ?? ""),
              ]),
            ),
          );
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          const fields = parseAdminArticle(
            Object.fromEntries(new FormData(event.currentTarget)),
          );
          if (!fields) {
            setError(
              "Enter a title (3–120 characters), summary (20–350), body (40–10,000) and available category.",
            );
            title.current?.focus();
            return;
          }
          setError("");
          dispatch({ type: "save-article", id: article?.id ?? "", fields });
          clearDraft();
          navigate({ record: "" });
        }}
      >
        <fieldset className="member-form-fields" disabled={!ready}>
          <legend className="sr-only">Resource details</legend>
          <p role="alert" className="field-error" id="article-error">
            {error}
          </p>
          <div className="search-field">
            <label htmlFor="article-title">Resource title</label>
            <input
              ref={title}
              id="article-title"
              name="title"
              maxLength={120}
              defaultValue={String(values.title)}
              aria-describedby="article-error"
            />
          </div>
          <div className="search-field">
            <label htmlFor="article-category">Resource category</label>
            <select
              id="article-category"
              name="category"
              defaultValue={String(values.category)}
            >
              {resourceCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="article-summary">Resource summary</label>
            <textarea
              id="article-summary"
              name="summary"
              rows={3}
              maxLength={350}
              defaultValue={String(values.summary)}
            />
          </div>
          <div className="search-field">
            <label htmlFor="article-body">Article body</label>
            <p className="field-help" id="article-body-help">
              Plain text, 40–10,000 characters. Separate paragraphs with a blank
              line.
            </p>
            <textarea
              id="article-body"
              name="body"
              rows={10}
              maxLength={10000}
              defaultValue={String(values.body)}
              aria-describedby="article-body-help"
            />
          </div>
          <Button type="submit">Save resource draft</Button>
        </fieldset>
      </form>
    </section>
  );
}

export function AdminContent() {
  const { state, dispatch, resetVersion } = useDemoSession();
  const { query, href } = useDashboardNavigation("admin");
  const article = state.articles.find((item) => item.id === query.record);
  return (
    <div className="admin-management-stack">
      <p className="workspace-note">
        Draft → review → publish operates in this tab. Published articles appear
        on Resources and in the preview below. No content is saved permanently.
      </p>
      {query.record ? (
        <>
          <Link className="text-link" href={href({ record: "" })}>
            ← Back to resources
          </Link>
          {query.record === "new" || article ? (
            <ArticleEditor
              key={`${query.record}-${resetVersion}`}
              article={article}
            />
          ) : (
            <p className="workspace-empty">
              Resource unavailable in this session.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="admin-inline-actions">
            <Link className="button" href={href({ record: "new" })}>
              Create resource
            </Link>
            <Link className="text-link" href="/resources">
              View published resources →
            </Link>
          </div>
          <div className="admin-management-grid">
            {state.articles.map((item) => (
              <article key={item.id} className="panel admin-management-card">
                <span className="section-tag">{item.status}</span>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                <div className="admin-inline-actions">
                  <Link className="text-link" href={href({ record: item.id })}>
                    Edit {item.title}
                  </Link>
                  <Button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `${item.status === "draft" ? "Publish" : "Unpublish"} ${item.title} on Resources in this tab?`,
                        )
                      )
                        dispatch({
                          type: "publish-article",
                          id: item.id,
                          published: item.status !== "published",
                        });
                    }}
                  >
                    {item.status === "draft"
                      ? "Publish to showcase"
                      : "Return to draft"}
                  </Button>
                </div>
                <details className="admin-article-preview">
                  <summary>Review saved article</summary>
                  {item.body.split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </details>
              </article>
            ))}
          </div>
        </>
      )}
      <section className="panel" data-testid="published-resource-preview">
        <h2>Published resource preview</h2>
        {state.articles.filter((item) => item.status === "published").length ? (
          state.articles
            .filter((item) => item.status === "published")
            .map((item) => (
              <article key={item.id} className="admin-article-preview">
                <p className="section-tag">
                  {
                    resourceCategories.find(
                      (category) => category.id === item.category,
                    )?.label
                  }
                </p>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                {item.body.split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </article>
            ))
        ) : (
          <p>
            No resources published in this showcase yet. Save and review a
            draft, then publish it here.
          </p>
        )}
      </section>
    </div>
  );
}
