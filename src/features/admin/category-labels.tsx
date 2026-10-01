"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoSession } from "@/features/member/demo-session";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";
import { parseCategoryName } from "@/validation/admin";

export function CategoryLabels({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { dispatch } = useDemoSession();
  const ready = useDemoReady();
  const [id, setId] = useState(catalog[0].id);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <details className="panel member-editor">
      <summary>Category display names</summary>
      <p>
        Rename labels in this session. IDs, associations, individual prices and
        billing identifiers stay unchanged. The public directory is unchanged.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          const name = parseCategoryName(
            new FormData(event.currentTarget).get("label"),
            id,
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
          dispatch({ type: "rename-category", id, name });
        }}
      >
        <fieldset className="member-form-fields" disabled={!ready}>
          <legend className="sr-only">Rename a demo category</legend>
          <div className="search-field">
            <label htmlFor="rename-category">Category to rename</label>
            <select
              id="rename-category"
              value={id}
              onChange={(event) => {
                setId(event.target.value);
                setError("");
              }}
            >
              {catalog.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="category-label">Display name</label>
            <input
              key={`${id}-${catalog.find((item) => item.id === id)?.name}`}
              id="category-label"
              name="label"
              ref={input}
              defaultValue={catalog.find((item) => item.id === id)?.name}
              maxLength={80}
              aria-invalid={!!error}
              aria-describedby="category-label-error"
            />
            <p id="category-label-error" role="alert" className="field-error">
              {error}
            </p>
          </div>
          <Button type="submit">Rename demo category</Button>
        </fieldset>
      </form>
    </details>
  );
}
