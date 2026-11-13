"use client";
import { QaFilterFields } from "./qa-filter-fields";

import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useSessionCategories } from "@/features/member/demo-session";
import type { DashboardArea } from "@/validation/dashboard";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
export function QaWorkspaceFilters({
  area,
  navigationPending = false,
}: {
  area: DashboardArea;
  navigationPending?: boolean;
}) {
  const { query, navigate, pending } = useDashboardNavigation(area);
  const ready = useDemoReady();
  const categories = useSessionCategories();
  return (
    <form
      key={`${query.queue}-${query.q}-${query.category}-${query.qaStatus}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready || pending || navigationPending) return;
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
      <fieldset
        disabled={!ready || pending || navigationPending}
        className="qa-filters"
      >
        <legend className="sr-only">Filter Q&A</legend>
        <QaFilterFields
          query={query}
          categories={categories}
          admin={area === "admin"}
        />
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
