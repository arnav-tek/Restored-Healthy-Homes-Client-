"use client";
import Link from "next/link";
import { publishedSessionArticles } from "@/domain/admin-showcase";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";

export function SessionResource({ id }: { id: string }) {
  const { state } = useDemoSession();
  const ready = useDemoReady();
  const article = publishedSessionArticles(state.articles).find(
    (item) => item.id === id,
  );
  return (
    <div className="container public-content-page resource-article">
      <Link className="text-link" href="/resources">
        Back to resources
      </Link>
      {!ready ? (
        <>
          <h1>Resource</h1>
          <p role="status">Loading resource…</p>
          <noscript>
            Enable JavaScript to view resources created in this tab.
          </noscript>
        </>
      ) : article ? (
        <article data-scroll-reveal>
          <header>
            <p className="section-tag">Published in this tab</p>
            <h1>{article.title}</h1>
            <p className="resource-lead">{article.summary}</p>
          </header>
          {article.body.split(/\n\s*\n/).map((paragraph, index) => (
            <p className="session-resource-paragraph" key={index}>
              {paragraph}
            </p>
          ))}
          <p className="field-help">
            Refresh or workspace reset clears session-created resources.
          </p>
        </article>
      ) : (
        <>
          <h1>Resource unavailable</h1>
          <p>
            This resource is unpublished or no longer available in this tab.
            Choose a published resource from the list.
          </p>
        </>
      )}
    </div>
  );
}
