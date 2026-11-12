"use client";
import { useRef, useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
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

export type ApplicationCategory = Pick<
  Category,
  "id" | "name" | "monthlyUsd"
> & { readonly previewPrice?: boolean; readonly active?: boolean };
const basicFields = [
  { name: "name", label: "Your name", type: "text" },
  { name: "businessName", label: "Business name", type: "text" },
  { name: "email", label: "Contact email", type: "email" },
  { name: "phone", label: "Phone (optional)", type: "tel" },
  { name: "website", label: "Website (optional)", type: "url" },
  { name: "city", label: "City", type: "text" },
  { name: "state", label: "State (2-letter abbreviation)", type: "text" },
  {
    name: "publicDisplayName",
    label: "Public professional / owner name (optional)",
    type: "text",
  },
  { name: "publicEmail", label: "Public email (optional)", type: "email" },
] as const;
const detailFields = [
  {
    name: "services",
    label: "Services",
    help: "One per line, up to 12 services, 120 characters each.",
    placeholder:
      "e.g. Mold inspections\nAir quality testing\nHealthy home consultations",
  },
  {
    name: "description",
    label: "Business description",
    help: "20–2,000 characters. Describe a business.",
    placeholder:
      "Share an overview of your business, what you do and who you serve.",
  },
  {
    name: "practices",
    label: "Healthy-home practices",
    help: "20–1,500 characters. Describe practices, without personal or medical information.",
    placeholder:
      "Tell us about the healthy-home practices you use in your work.",
  },
  {
    name: "listedCredentials",
    label: "Listed credentials (optional)",
    help: "One per line, up to 10, 120 characters each. New or edited claims need review, unchanged claims keep their decision. The platform does not issue certifications.",
    placeholder:
      "e.g. Licensed Contractor (CA)\nBuilding Biology Institute (BBI)\nIndoor Air Quality Association (IAQA)",
  },
] as const;

export function ProfileFieldsEditor({
  catalog,
  initial,
  submitLabel,
  onValid,
  draft,
  saveDraft = () => {},
  clearDraft = () => {},
  disabled = false,
  variant = "workspace",
}: {
  catalog: readonly ApplicationCategory[];
  initial?: MemberProfileFields;
  submitLabel: string;
  onValid: (
    profile: MemberProfileFields,
  ) => void | boolean | Promise<void | boolean>;
  draft?: Record<string, string | string[]>;
  saveDraft?: (draft: Record<string, string | string[]>) => void;
  clearDraft?: () => void;
  disabled?: boolean;
  variant?: "application" | "workspace";
}) {
  const ready = useDemoReady();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () => {
      const raw = draft?.categoryIds ?? initial?.categoryIds ?? [];
      return Array.isArray(raw) ? raw : [raw].filter(Boolean);
    },
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || disabled) return;
    const data = new FormData(event.currentTarget);
    const raw = Object.fromEntries(
      applicationFieldOrder.map((field) => [
        field,
        field === "categoryIds" ? data.getAll(field) : data.get(field),
      ]),
    );
    const result = parseApplication(
      raw,
      catalog.filter((category) => category.active !== false),
    );
    if (!result.ok) {
      setErrors(result.errors);
      const first = applicationFieldOrder.find((field) => result.errors[field]);
      const control =
        first === "categoryIds"
          ? form.current?.querySelector('input[name="categoryIds"]:not(:disabled)')
          : form.current?.elements.namedItem(first ?? "name");
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveError("");
    try {
      if ((await onValid(result.profile)) !== false) clearDraft();
    } catch {
      setSaveError(
        "Unable to save. Your draft is still here; please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      ref={form}
      method="post"
      onSubmit={submit}
      onChange={(event) => {
        const data = new FormData(event.currentTarget);
        const currentCategories = data.getAll("categoryIds").map(String);
        setSelectedCategoryIds(currentCategories);
        saveDraft(
          Object.fromEntries(
            applicationFieldOrder.map((field) => [
              field,
              field === "categoryIds"
                ? currentCategories
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
          JavaScript is required for this form. Form controls are disabled so
          nothing can be submitted to a server.
        </p>
      </noscript>
      {saveError && (
        <p role="alert" className="field-error">
          {saveError}
        </p>
      )}
      <fieldset
        disabled={!ready || disabled || saving}
        className="member-form-fields"
      >
        <legend className="sr-only">Business details</legend>
        {variant !== "application" && (
          <p className="field-help">
            All fields are required unless marked optional.
          </p>
        )}
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
              {name === "email" ? (
                <div className="input-with-icon">
                  <input
                    id={`member-form-${name}`}
                    name={name}
                    type={type}
                    className="has-trailing-icon"
                    required
                    maxLength={applicationLimits[name]}
                    defaultValue={draft?.[name] ?? initial?.[name] ?? ""}
                    aria-invalid={!!errors[name]}
                    aria-describedby={
                      errors[name] ? `${name}-error` : undefined
                    }
                  />
                  <Mail
                    className="input-trailing-icon"
                    size={16}
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <input
                  id={`member-form-${name}`}
                  name={name}
                  type={type}
                  required={
                    ![
                      "phone",
                      "website",
                      "publicDisplayName",
                      "publicEmail",
                    ].includes(name)
                  }
                  maxLength={applicationLimits[name]}
                  defaultValue={draft?.[name] ?? initial?.[name] ?? ""}
                  aria-invalid={!!errors[name]}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                />
              )}
              {errors[name] ? (
                <p className="field-error" id={`${name}-error`}>
                  {errors[name]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <p className="field-help">
          Public name and public email are optional and separate from your
          private application contact name and email. Phone and website, when
          provided, appear publicly.
        </p>
        <div className="form-section-divider" aria-hidden="true" />
        <fieldset
          className="application-categories"
          aria-describedby="category-help category-error"
        >
          <legend className="application-section-legend">
            Professional categories
          </legend>
          <p
            className="field-help application-category-help"
            id="category-help"
          >
            Select the category or categories that best describe your work.
            Confirmed monthly prices are in USD for individual categories. You
            may select multiple categories; combined pricing is pending
            confirmation. No payment is taken.
            {catalog.some((category) => category.previewPrice) &&
              " Added-category prices are preview values for this tab only."}
            {catalog.some((category) => category.active === false) &&
              " Unavailable categories are saved assignments only. Choose an active replacement; unavailable assignments will be removed when you save."}
          </p>
          <div className="application-category-grid">
            {catalog.map((category) => {
              const isChecked = selectedCategoryIds.includes(category.id);
              return (
                <label
                  key={category.id}
                  className={`category-choice ${isChecked ? "is-selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={category.id}
                    disabled={category.active === false}
                    defaultChecked={(
                      draft?.categoryIds ??
                      initial?.categoryIds ??
                      []
                    ).includes(category.id)}
                    onChange={(e) => {
                      setSelectedCategoryIds((prev) =>
                        e.target.checked
                          ? [...prev, category.id]
                          : prev.filter((id) => id !== category.id),
                      );
                    }}
                    aria-invalid={!!errors.categoryIds}
                  />
                  <span className="category-choice-text">
                    <span className="category-choice-name">
                      {category.name}
                    </span>
                    <small className="category-choice-price">
                      {category.active === false
                        ? "Unavailable for selection"
                        : `${formatMonthlyPrice(category.monthlyUsd)} / month${category.previewPrice ? " · preview" : ""}`}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.categoryIds ? (
            <p className="field-error" id="category-error">
              {errors.categoryIds}
            </p>
          ) : null}
        </fieldset>
        <div className="form-section-divider" aria-hidden="true" />
        {detailFields.map(({ name, label, help, placeholder }) => {
          const value = draft?.[name] ?? initial?.[name];
          return (
            <div className="search-field application-textarea-field" key={name}>
              <label htmlFor={`member-form-${name}`}>{label}</label>
              <p className="field-help" id={`${name}-help`}>
                {help}
              </p>
              <textarea
                id={`member-form-${name}`}
                name={name}
                rows={3}
                required={name !== "listedCredentials"}
                maxLength={applicationLimits[name]}
                placeholder={placeholder}
                defaultValue={
                  Array.isArray(value) ? value.join("\n") : (value ?? "")
                }
                aria-invalid={!!errors[name]}
                aria-describedby={`${name}-help${errors[name] ? ` ${name}-error` : ""}`}
              />
              {errors[name] ? (
                <p className="field-error" id={`${name}-error`}>
                  {errors[name]}
                </p>
              ) : null}
            </div>
          );
        })}
        <Button
          type="submit"
          className={
            variant === "application" ? "application-submit-btn" : undefined
          }
        >
          {saving ? "Saving…" : submitLabel}
        </Button>
      </fieldset>
    </form>
  );
}
