"use client";
import { useRef, useState, type FormEvent } from "react";
import type { Category } from "@/domain/categories";
import { formatMonthlyPrice } from "@/domain/categories";
import type { MemberProfileFields } from "@/domain/demo-member";
import {
  applicationLimits,
  applicationFieldOrder,
  parseApplication,
  type ApplicationErrors,
} from "@/validation/application";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoDraft } from "./demo-session";

export type ApplicationCategory = Pick<Category, "id" | "name" | "monthlyUsd">;
const basicFields = [
  { name: "name", label: "Your name", type: "text" },
  { name: "businessName", label: "Business name", type: "text" },
  { name: "email", label: "Contact email", type: "email" },
  { name: "phone", label: "Phone (optional)", type: "tel" },
  { name: "website", label: "Website (optional)", type: "url" },
  { name: "city", label: "City", type: "text" },
  { name: "state", label: "State (2-letter abbreviation)", type: "text" },
] as const;
const detailFields = [
  {
    name: "services",
    label: "Services",
    help: "One per line; up to 12 services, 120 characters each.",
  },
  {
    name: "description",
    label: "Business description",
    help: "20–2,000 characters. Describe a fictional business.",
  },
  {
    name: "practices",
    label: "Healthy-home practices",
    help: "20–1,500 characters. Describe sample practices, without personal or medical information.",
  },
  {
    name: "listedCredentials",
    label: "Listed credentials (optional)",
    help: "One per line; up to 10, 120 characters each. New or edited claims need review; unchanged claims keep their demo decision. The platform does not issue certifications.",
  },
] as const;

export function ProfileFieldsForm({
  catalog,
  initial,
  submitLabel,
  onValid,
  draftKey = "application",
  disabled = false,
}: {
  catalog: readonly ApplicationCategory[];
  initial?: MemberProfileFields;
  submitLabel: string;
  onValid: (profile: MemberProfileFields) => void;
  draftKey?: string;
  disabled?: boolean;
}) {
  const { draft, saveDraft, clearDraft } = useDemoDraft(draftKey);
  const ready = useDemoReady();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const raw = Object.fromEntries(
      applicationFieldOrder.map((field) => [
        field,
        field === "categoryIds" ? data.getAll(field) : data.get(field),
      ]),
    );
    const result = parseApplication(raw, catalog);
    if (!result.ok) {
      setErrors(result.errors);
      const first = applicationFieldOrder.find((field) => result.errors[field]);
      const control =
        first === "categoryIds"
          ? form.current?.querySelector('input[name="categoryIds"]')
          : form.current?.elements.namedItem(first ?? "name");
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    setErrors({});
    clearDraft();
    onValid(result.profile);
  }
  return (
    <form
      ref={form}
      onSubmit={submit}
      onChange={(event) => {
        const data = new FormData(event.currentTarget);
        saveDraft(
          Object.fromEntries(
            applicationFieldOrder.map((field) => [
              field,
              field === "categoryIds"
                ? data.getAll(field).map(String)
                : String(data.get(field) ?? ""),
            ]),
          ),
        );
      }}
      noValidate
      autoComplete="off"
      className="member-fields-form"
    >
      <noscript>
        <p>
          JavaScript is required for this local demo. Form controls are disabled
          so nothing can be submitted to a server.
        </p>
      </noscript>
      <fieldset disabled={!ready || disabled} className="member-form-fields">
        <legend className="sr-only">Fictional business details</legend>
        <p className="field-help">
          Use fictional information only. All fields are required unless marked
          optional.
        </p>
        {Object.keys(errors).length ? (
          <p role="alert" className="field-error">
            Check the highlighted fields. Nothing has been submitted.
          </p>
        ) : null}
        <div className="application-field-grid">
          {basicFields.map(({ name, label, type }) => (
            <div
              className={
                name === "website"
                  ? "search-field application-website"
                  : "search-field"
              }
              key={name}
            >
              <label htmlFor={`member-form-${name}`}>{label}</label>
              <input
                id={`member-form-${name}`}
                name={name}
                type={type}
                required={name !== "phone" && name !== "website"}
                maxLength={applicationLimits[name]}
                defaultValue={draft?.[name] ?? initial?.[name] ?? ""}
                aria-invalid={!!errors[name]}
                aria-describedby={errors[name] ? `${name}-error` : undefined}
              />
              {errors[name] ? (
                <p className="field-error" id={`${name}-error`}>
                  {errors[name]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <fieldset
          className="application-categories"
          aria-describedby="category-help category-error"
        >
          <legend>Professional categories</legend>
          <div className="application-category-grid">
            {catalog.map((category) => (
              <label key={category.id} className="category-choice">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  defaultChecked={(
                    draft?.categoryIds ??
                    initial?.categoryIds ??
                    []
                  ).includes(category.id)}
                  aria-invalid={!!errors.categoryIds}
                />
                <span>
                  {category.name}
                  <small>
                    {formatMonthlyPrice(category.monthlyUsd)} / month
                  </small>
                </span>
              </label>
            ))}
          </div>
          <p className="field-help" id="category-help">
            Confirmed monthly prices in USD for individual categories. You may
            select multiple categories; combined pricing is pending
            confirmation. No payment is taken.
          </p>
          <p className="field-error" id="category-error">
            {errors.categoryIds ?? ""}
          </p>
        </fieldset>
        {detailFields.map(({ name, label, help }) => {
          const value = draft?.[name] ?? initial?.[name];
          return (
            <div className="search-field" key={name}>
              <label htmlFor={`member-form-${name}`}>{label}</label>
              <textarea
                id={`member-form-${name}`}
                name={name}
                rows={3}
                required={name !== "listedCredentials"}
                maxLength={applicationLimits[name]}
                defaultValue={
                  Array.isArray(value) ? value.join("\n") : (value ?? "")
                }
                aria-invalid={!!errors[name]}
                aria-describedby={`${name}-help${errors[name] ? ` ${name}-error` : ""}`}
              />
              <p className="field-help" id={`${name}-help`}>
                {help}
              </p>
              {errors[name] ? (
                <p className="field-error" id={`${name}-error`}>
                  {errors[name]}
                </p>
              ) : null}
            </div>
          );
        })}
        <Button type="submit">{submitLabel}</Button>
      </fieldset>
    </form>
  );
}
