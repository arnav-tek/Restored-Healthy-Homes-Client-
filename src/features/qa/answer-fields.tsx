import type { RefObject } from "react";
import { answerLimits } from "@/validation/qa-moderation";
export function AnswerFields({
  value,
  onChange,
  error,
  inputRef,
  id = "qa-answer-body",
}: {
  value: string;
  onChange: (value: string) => void;
  error: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  id?: string;
}) {
  return (
    <div className="search-field">
      <label htmlFor={id}>Answer text</label>
      <textarea
        id={id}
        name="body"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        maxLength={answerLimits.max}
        aria-invalid={!!error}
        aria-describedby={`${id}-help ${id}-error`}
      />
      <p className="field-help" id={`${id}-help`}>
        20–3,000 characters. Avoid personal medical details or clinical advice.
        Changes need review before publication.
      </p>
      <p className="field-error" id={`${id}-error`} role="alert">
        {error}
      </p>
    </div>
  );
}
