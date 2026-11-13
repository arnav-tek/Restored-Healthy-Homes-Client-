import type { QuestionFields } from "@/domain/qa";
import {
  questionLimits,
  type QuestionErrors,
  type QuestionField,
} from "@/validation/qa";
export function QuestionFieldsEditor({
  value,
  onChange,
  errors,
  catalog,
}: {
  value: QuestionFields;
  onChange: (value: QuestionFields) => void;
  errors: QuestionErrors;
  catalog: readonly { id: string; name: string }[];
}) {
  function props(field: QuestionField) {
    return {
      id: `question-${field}`,
      name: field,
      required: true,
      "aria-invalid": !!errors[field],
      "aria-describedby": `${field}-help ${field}-error`,
    };
  }
  return (
    <>
      {" "}
      <div className="search-field">
        <label htmlFor="question-title">Question title</label>
        <input
          {...props("title")}
          value={value.title}
          maxLength={questionLimits.title}
          onChange={(event) =>
            onChange({ ...value, title: event.target.value })
          }
        />
        <p id="title-help" className="field-help">
          10–160 characters. Summarize a service or home-project question.
        </p>
        <p id="title-error" className="field-error">
          {errors.title}
        </p>
      </div>
      <div className="search-field">
        <label htmlFor="question-categoryId">Relevant category</label>
        <select
          {...props("categoryId")}
          value={value.categoryId}
          onChange={(event) =>
            onChange({ ...value, categoryId: event.target.value })
          }
        >
          <option value="">Choose a category</option>
          {catalog.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p id="categoryId-help" className="field-help">
          Choose the one category that best fits your question.
        </p>
        <p id="categoryId-error" className="field-error">
          {errors.categoryId}
        </p>
      </div>
      <div className="search-field">
        <label htmlFor="question-body">Question text</label>
        <textarea
          {...props("body")}
          value={value.body}
          rows={7}
          maxLength={questionLimits.body}
          onChange={(event) => onChange({ ...value, body: event.target.value })}
        />
        <p id="body-help" className="field-help">
          20–2,000 characters. Describe a project and what you would like to
          ask.
        </p>
        <p id="body-error" className="field-error">
          {errors.body}
        </p>
      </div>
    </>
  );
}
