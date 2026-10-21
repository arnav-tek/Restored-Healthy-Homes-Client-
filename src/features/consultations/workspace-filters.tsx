"use client";
import { useSessionCategories } from "@/features/member/demo-session";
import {
  consultationStatuses,
  consultationStatusLabels,
} from "@/domain/consultation";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoSession } from "@/features/member/demo-session";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";
import type { DashboardArea } from "@/validation/dashboard";
export function ConsultationFilters({ area }: { area: DashboardArea }) {
  const { query, navigate, pending } = useDashboardNavigation(area);
  const { state } = useDemoSession();
  const categories = useSessionCategories();
  const ready = useDemoReady();
  return (
    <fieldset disabled={!ready || pending} className="consultation-filters">
      <legend>Filter consultation requests</legend>
      <div className="search-field">
        <label htmlFor="consultation-status-filter">Request status</label>
        <select
          id="consultation-status-filter"
          value={query.consultationStatus}
          onChange={(event) =>
            navigate({
              consultationStatus: event.target.value,
              consultation: "",
            })
          }
        >
          <option value="all">All statuses</option>
          {consultationStatuses.map((status) => (
            <option key={status} value={status}>
              {consultationStatusLabels[status]}
            </option>
          ))}
        </select>
      </div>
      {area === "admin" && (
        <>
          <div className="search-field">
            <label htmlFor="consultation-category-filter">
              Consultation category
            </label>
            <select
              id="consultation-category-filter"
              value={query.category}
              onChange={(event) =>
                navigate({ category: event.target.value, consultation: "" })
              }
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {state.categoryNames[category.id]}
                </option>
              ))}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="consultation-assignment-filter">Assignment</label>
            <select
              id="consultation-assignment-filter"
              value={query.assignment}
              onChange={(event) =>
                navigate({
                  assignment:
                    event.target.value === "assigned"
                      ? "assigned"
                      : event.target.value === "unassigned"
                        ? "unassigned"
                        : "all",
                  consultation: "",
                })
              }
            >
              <option value="all">All assignments</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </>
      )}
      <button
        type="button"
        className="button button-secondary"
        onClick={() =>
          navigate({
            consultationStatus: "all",
            category: "",
            assignment: "all",
            consultation: "",
          })
        }
      >
        Clear consultation filters
      </button>
    </fieldset>
  );
}
