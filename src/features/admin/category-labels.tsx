"use client";
import { useRef, useState } from "react";
import {
  Tag,
  Edit3,
  Search,
  Shield,
  Hammer,
  House,
  Wrench,
  Ruler,
  HeartPulse,
  Dog,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const categoryIcons: Readonly<Record<string, LucideIcon>> = {
  "mold-inspection": Search,
  "mold-remediation": Shield,
  "healthy-renovations": Hammer,
  "healthy-builders": House,
  "healthy-trades": Wrench,
  "healthy-designers": Ruler,
  "health-practitioners": HeartPulse,
  "mold-detection-dogs": Dog,
};
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoDraft, useDemoSession } from "@/features/member/demo-session";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";
import { formatMonthlyPrice } from "@/domain/categories";
import { parseCategoryName } from "@/validation/admin";
import { useDashboardNavigation } from "@/features/dashboard/use-dashboard-navigation";

function CategoryForm({
  category,
  catalog,
  pending,
}: {
  category: ApplicationCategory;
  catalog: readonly ApplicationCategory[];
  pending: boolean;
}) {
  const { dispatch } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(
    `category:${category.id}`,
  );
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const status = useRef<HTMLParagraphElement>(null);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        const name = parseCategoryName(
          new FormData(event.currentTarget).get("label"),
          category.id,
          catalog,
        );
        if (!name) {
          setError(
            "Use a distinct name of 3–80 characters. Empty or equivalent labels are not allowed.",
          );
          input.current?.focus();
          return;
        }
        setError("");
        dispatch({ type: "rename-category", id: category.id, name });
        clearDraft();
        setFeedback(`Display name updated to ${name} .`);
        requestAnimationFrame(() => status.current?.focus());
      }}
    >
      <fieldset className="member-form-fields admin-category-fields" disabled={!ready || pending}>
        <legend className="sr-only">Rename a category</legend>
        <div className="search-field">
          <label htmlFor="category-label">Display name</label>
          <input
            id="category-label"
            name="label"
            ref={input}
            value={String(draft?.label ?? category.name)}
            onChange={(event) => saveDraft({ label: event.target.value })}
            maxLength={80}
            aria-invalid={!!error}
            aria-describedby="category-label-error"
          />
          <p id="category-label-error" role="alert" className="field-error">
            {error}
          </p>
        </div>
        <div className="category-price-info">
          <span>Individual price:</span>{" "}
          <strong>{formatMonthlyPrice(category.monthlyUsd)} / month</strong>{" "}
          <span className="price-unchanged">(unchanged)</span>
        </div>
        <Button type="submit" className="button-primary">Rename category</Button>
      </fieldset>
      <p ref={status} role="status" tabIndex={-1} className="session-status">
        {feedback}
      </p>
    </form>
  );
}

export function CategoryLabels({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const ready = useDemoReady();
  const { query, navigate, pending } = useDashboardNavigation("admin");
  const id = query.category || catalog[0].id;
  const category = catalog.find((item) => item.id === id)!;

  return (
    <div className="admin-categories-workspace">
      {/* Category Overview Grid */}
      <section className="categories-grid-section">
        <h2 className="admin-section-heading">Directory Categories</h2>
        <p className="admin-section-sub">
          Current categories and their monthly pricing. Select a category below to rename its label.
        </p>

        <div className="categories-cards-grid">
          {catalog.map((item) => {
            const isSelected = item.id === id;
            const CategoryIcon = categoryIcons[item.id] ?? Tag;
            return (
              <div
                key={item.id}
                className={`category-summary-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => navigate({ category: item.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ category: item.id });
                  }
                }}
              >
                <div className="category-card-top">
                  <div className="category-icon-wrap">
                    <CategoryIcon size={18} aria-hidden="true" />
                  </div>
                  <span className="category-price-pill">
                    {formatMonthlyPrice(item.monthlyUsd)}/mo
                  </span>
                </div>
                <div className="category-card-content">
                  <h3 className="category-card-title">{item.name}</h3>
                  <code className="category-card-id">{item.id}</code>
                </div>
                <div className="category-card-footer">
                  <span className="category-edit-action">
                    <Edit3 size={13} aria-hidden="true" />
                    <span>{isSelected ? "Currently editing" : "Edit label"}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Edit Form Panel */}
      <section className="panel admin-detail-card category-edit-panel">
        <h2 className="admin-detail-heading">Category display names</h2>
        <p className="admin-card-desc">
          Rename a label without changing category associations, IDs, individual
          prices or billing identifiers. The public directory keeps its original
          labels.
        </p>
        <div className="search-field category-select">
          <label htmlFor="rename-category">Category to rename</label>
          <select
            id="rename-category"
            disabled={!ready || pending}
            value={id}
            onChange={(event) => navigate({ category: event.target.value })}
          >
            {catalog.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <CategoryForm
          key={id}
          category={category}
          catalog={catalog}
          pending={pending}
        />
      </section>
    </div>
  );
}
