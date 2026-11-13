import Link from "next/link";
import type { QaAdminFilters, QaAdminWorkspace } from "@/domain/qa-admin";
import { QaFilterFields } from "./qa-filter-fields";
import { ConnectedModerationForm } from "./connected-moderation-form";
import { Button } from "@/components/ui/button";
import { inquiryDate } from "@/features/member/inquiry-date";
export function qaAdminHref(
  filters: QaAdminFilters,
  change: Partial<QaAdminFilters> = {},
) {
  const f = { ...filters, ...change },
    query = new URLSearchParams();
  for (const [k, v] of Object.entries(f))
    if (v !== null && v !== "") query.set(k, String(v));
  return `/admin/questions?${query}`;
}
export function ConnectedAdminQa({
  data,
  filters,
}: {
  data: QaAdminWorkspace;
  filters: QaAdminFilters;
}) {
  const detail = data.detail,
    back = qaAdminHref(filters, { id: null });
  return (
    <div className="qa-workspace min-w-0 [overflow-wrap:anywhere]">
      <nav className="qa-queue-nav" aria-label="Q&A queues">
        {(["questions", "answers"] as const).map((queue) => (
          <Link
            className={`qa-queue-card ${queue === data.queue ? "is-selected" : ""}`}
            key={queue}
            href={qaAdminHref(filters, {
              queue,
              id: null,
              parent: null,
              page: 1,
            })}
            aria-current={queue === data.queue ? "page" : undefined}
          >
            <div className="qa-queue-card-header">
              <span className="qa-queue-card-title">
                {queue === "questions" ? "Questions" : "Answers"}
              </span>
              <span className="qa-pending-badge">
                {queue === "questions"
                  ? data.counts.pendingQuestions
                  : data.counts.pendingAnswers}{" "}
                pending
              </span>
            </div>
            <div className="qa-queue-card-meta">
              {data.counts[queue]} total in queue
            </div>
          </Link>
        ))}
      </nav>
      {detail ? (
        <div className="review-detail-container grid gap-6">
          <Link href={back} className="text-link workspace-back-link">
            ← Back to {data.queue} queue
          </Link>
          <article className="panel admin-detail-card qa-question-body min-w-0">
            <div className="qa-detail-meta">
              <span className="qa-category-tag">
                {data.catalog.find((c) => c.id === detail.categoryId)?.name ??
                  "Specialty"}
              </span>
              <span className="admin-status-badge badge-pending">
                {detail.kind}: {detail.status}
              </span>
            </div>
            <h2 className="admin-detail-heading">{detail.title}</h2>
            <p>
              Saved version {detail.version}
              {detail.kind === "answer"
                ? ` · Parent ${detail.parentStatus}, version ${detail.parentVersion}`
                : ""}
            </p>
            {detail.kind === "answer" && (
              <p>
                Answer by {detail.attribution || "Unavailable specialist"}.{" "}
                {detail.status === "published" &&
                detail.parentStatus !== "published"
                  ? "This answer is not publicly visible."
                  : ""}
              </p>
            )}
            <div className="qa-body-card">
              <p className="qa-plain-text">{detail.body}</p>
            </div>
            {detail.kind === "question" ? (
              <p>
                <Link
                  href={qaAdminHref(filters, {
                    queue: "answers",
                    id: null,
                    parent: detail.id,
                    status: "all",
                    page: 1,
                  })}
                >
                  Review answers for this question ({detail.answerCount})
                </Link>
              </p>
            ) : (
              <p>
                <Link
                  href={qaAdminHref(filters, {
                    queue: "questions",
                    id: detail.questionId,
                    parent: null,
                  })}
                >
                  Review parent question
                </Link>
              </p>
            )}
            {detail.parentStatus === "published" && (
              <Link
                href={`/questions/${detail.questionId}`}
                target="_blank"
                rel="noopener"
              >
                Open current public question (new tab)
              </Link>
            )}
          </article>
          <ConnectedModerationForm
            key={detail.id}
            item={detail}
            compareHref={qaAdminHref(filters)}
          />
          <section className="panel min-w-0">
            <h3>Private decision history</h3>
            {detail.history.length ? (
              <ol className="grid gap-4">
                {detail.history.map((h) => (
                  <li key={h.version}>
                    <strong>
                      {h.action} · Version {h.version}: {h.previousStatus} →{" "}
                      {h.nextStatus}
                    </strong>
                    <p>
                      {inquiryDate(h.at)} · Actor {h.actorId}
                    </p>
                    <p>Reason: {h.reason}</p>
                    {h.note && <p>Private note: {h.note}</p>}
                    <details>
                      <summary>Content reviewed for this decision</summary>
                      <h4>{h.title}</h4>
                      <p className="qa-plain-text">{h.body}</p>
                    </details>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No saved moderation decisions yet.</p>
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="admin-filter-card">
            <form action="/admin/questions" method="get">
              <input type="hidden" name="queue" value={filters.queue} />
              {filters.parent && (
                <input type="hidden" name="parent" value={filters.parent} />
              )}
              <fieldset className="qa-filters grid gap-4">
                <legend className="sr-only">Filter Q&A</legend>
                <QaFilterFields
                  query={{
                    q: filters.q,
                    category: filters.category,
                    qaStatus: filters.status,
                  }}
                  categories={data.catalog}
                  admin
                  statusName="status"
                  includeHidden
                />
                <div className="filter-actions">
                  <Button type="submit">Filter Q&A</Button>
                  <Link
                    className="button button-secondary"
                    href={qaAdminHref(filters, {
                      q: "",
                      category: "",
                      status: "all",
                      page: 1,
                      parent: null,
                    })}
                  >
                    Clear Q&A filters
                  </Link>
                </div>
              </fieldset>
            </form>
          </div>
          <p role="status" className="result-count">
            {data.total} matching {data.queue}
          </p>
          <ol className="qa-cards-list">
            {data.items.map((item) => (
              <li key={item.id}>
                <article className="qa-record-card">
                  <div className="qa-card-meta-row">
                    <span className="qa-category-tag">
                      {data.catalog.find((c) => c.id === item.categoryId)
                        ?.name ?? "Specialty"}
                    </span>
                    <span className="admin-status-badge badge-pending">
                      {item.status}
                    </span>
                  </div>
                  <h2 className="qa-card-title">
                    <Link href={qaAdminHref(filters, { id: item.id })}>
                      {item.kind === "answer"
                        ? `Review answer by ${item.attribution || "unavailable specialist"}`
                        : item.title}
                    </Link>
                  </h2>
                  {item.kind === "answer" && (
                    <p className="qa-card-parent-ref">
                      Parent: {item.title} ({item.parentStatus})
                    </p>
                  )}
                  <p className="qa-card-preview">
                    {item.body.slice(0, 150)}
                    {item.body.length > 150 ? "…" : ""}
                  </p>
                  <Link
                    className="table-action-link"
                    href={qaAdminHref(filters, { id: item.id })}
                  >
                    Moderate {item.kind} →
                  </Link>
                </article>
              </li>
            ))}
          </ol>
          {!data.items.length && (
            <div className="workspace-empty">
              <h2>No {data.queue} match</h2>
              <p>Change filters or return after new content is submitted.</p>
            </div>
          )}
          <nav
            aria-label="Moderation queue pages"
            className="admin-inline-actions"
          >
            {data.page > 1 && (
              <Link href={qaAdminHref(filters, { page: data.page - 1 })}>
                Previous page
              </Link>
            )}
            <span>Page {data.page}</span>
            {data.hasNext && (
              <Link href={qaAdminHref(filters, { page: data.page + 1 })}>
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
      <p className="field-help">
        Notification events are recorded separately from inquiry jobs. Queued
        does not mean sent or delivered; application email remains disabled.
      </p>
    </div>
  );
}
