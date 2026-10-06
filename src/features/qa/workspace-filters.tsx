"use client";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { categories } from "@/domain/categories";
import type { DashboardArea } from "@/validation/dashboard";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
export function QaWorkspaceFilters({ area }: { area: DashboardArea }) {
  const { query, navigate, pending } = useDashboardNavigation(area);
  const ready = useDemoReady();
  return (
    <form
      key={`${query.q}-${query.category}-${query.qaStatus}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready || pending) return;
        const data = new FormData(event.currentTarget);
        navigate({
          q: String(data.get("q") ?? ""),
          category: String(data.get("category") ?? ""),
          qaStatus: String(data.get("qaStatus") ?? "all"),
          question: "",
          answer: "",
        });
      }}
    >
      <fieldset disabled={!ready || pending} className="qa-filters">
        <legend className="sr-only">Filter Q&A</legend>
        <div className="search-field">
          <label htmlFor="workspace-qa-q">Q&A keyword</label>
          <input
            id="workspace-qa-q"
            name="q"
            maxLength={120}
            defaultValue={query.q}
          />
        </div>
        <div className="search-field">
          <label htmlFor="workspace-qa-category">Q&A category</label>
          <select
            id="workspace-qa-category"
            name="category"
            defaultValue={query.category}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        {area === "admin" && (
          <div className="search-field">
            <label htmlFor="workspace-qa-status">Publication status</label>
            <select
              id="workspace-qa-status"
              name="qaStatus"
              defaultValue={query.qaStatus}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}
        <div className="filter-actions">
          <Button type="submit">Filter Q&A</Button>
          <Button
            className="button-secondary"
            type="button"
            onClick={() =>
              navigate({
                q: "",
                category: "",
                qaStatus: "all",
                question: "",
                answer: "",
              })
            }
          >
            Clear Q&A filters
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
