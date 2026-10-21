"use client";
import { useRef, useState } from "react";
import {
  useDemoDraft,
  useDemoSession,
  useSessionCategories,
} from "@/features/member/demo-session";
import { parseNewCategory } from "@/validation/admin-editors";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";

export function CategoryCreate() {
  const { dispatch } = useDemoSession();
  const catalog = useSessionCategories();
  const { draft, saveDraft, clearDraft } = useDemoDraft("admin-new-category");
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const name = useRef<HTMLInputElement>(null);
  return (
    <section className="panel admin-management-stack admin-editor-panel">
      <div className="admin-editor-heading">
        <h2>Create a category</h2>
        <p>
          Add a category for applications, profiles, questions and consultations
          in this tab.
        </p>
      </div>
      <form
        noValidate
        onChange={(event) => {
          const data = new FormData(event.currentTarget);
          saveDraft(
            Object.fromEntries(
              ["name", "description", "monthlyUsd"].map((key) => [
                key,
                String(data.get(key) ?? ""),
              ]),
            ),
          );
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          const data = new FormData(event.currentTarget);
          const fields = parseNewCategory(
            {
              name: data.get("name"),
              description: data.get("description"),
              monthlyUsd: Number(data.get("monthlyUsd")),
            },
            catalog,
          );
          if (!fields) {
            setError(
              "Use a unique name (3–80 characters), description (20–300) and whole-dollar preview price ($1–$10,000). Up to 32 categories are available in a session.",
            );
            name.current?.focus();
            return;
          }
          dispatch({ type: "create-category", fields });
          clearDraft();
          setError("");
          event.currentTarget.reset();
        }}
      >
        <fieldset className="member-form-fields" disabled={!ready}>
          <legend className="sr-only">New category details</legend>
          <p role="alert" className="field-error" id="new-category-error">
            {error}
          </p>
          <div className="search-field">
            <label htmlFor="new-category-name">New category name</label>
            <input
              id="new-category-name"
              name="name"
              ref={name}
              defaultValue={String(draft?.name ?? "")}
              maxLength={80}
              aria-describedby="new-category-error"
            />
          </div>
          <div className="search-field">
            <label htmlFor="new-category-description">
              Category description
            </label>
            <textarea
              id="new-category-description"
              name="description"
              defaultValue={String(draft?.description ?? "")}
              maxLength={300}
              rows={3}
            />
          </div>
          <div className="search-field">
            <label htmlFor="new-category-price">
              Preview monthly price (USD)
            </label>
            <input
              id="new-category-price"
              name="monthlyUsd"
              type="number"
              min={1}
              max={10000}
              step={1}
              defaultValue={String(draft?.monthlyUsd ?? "")}
              aria-describedby="new-price-help"
            />
            <p id="new-price-help" className="field-help">
              For this showcase only. Existing category prices stay unchanged.
              No billing is connected; combined pricing still needs agreement.
            </p>
          </div>
          <Button type="submit">Create category</Button>
        </fieldset>
      </form>
    </section>
  );
}
