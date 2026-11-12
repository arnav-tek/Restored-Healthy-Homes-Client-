import {
  inquiryLimits,
  type InquiryErrors,
  type InquiryField,
} from "@/validation/inquiry";

/** Shared accessible fields; demo and connected transports keep separate state. */
export function InquiryFields({ errors }: { errors: InquiryErrors }) {
  function props(field: InquiryField) {
    return {
      id: `inquiry-${field}`,
      name: field,
      required: true,
      maxLength: inquiryLimits[field],
      "aria-invalid": !!errors[field],
      "aria-describedby":
        [
          field === "message" ? "inquiry-message-help" : "",
          errors[field] ? `inquiry-${field}-error` : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  }
  function error(field: InquiryField) {
    return errors[field] ? (
      <p className="field-error" id={`inquiry-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  }
  return (
    <>
      <p className="field-help">All fields are required.</p>
      {Object.keys(errors).length > 0 && (
        <p className="field-error" role="alert">
          Check the highlighted fields below.
        </p>
      )}
      <div className="search-field">
        <label htmlFor="inquiry-name">Name</label>
        <input
          {...props("name")}
          type="text"
          placeholder="Your name"
          autoComplete="name"
        />
        {error("name")}
      </div>
      <div className="search-field">
        <label htmlFor="inquiry-email">Email</label>
        <input
          {...props("email")}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          spellCheck={false}
        />
        {error("email")}
      </div>
      <div className="search-field">
        <label htmlFor="inquiry-message">Message</label>
        <textarea
          {...props("message")}
          rows={5}
          minLength={10}
          placeholder="I would like to learn about your services for a project."
        />
        <p className="field-help" id="inquiry-message-help">
          10–2,000 characters. Describe a project or service question.
        </p>
        {error("message")}
      </div>
    </>
  );
}
