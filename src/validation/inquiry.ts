export const inquiryLimits = { name: 80, email: 254, message: 2000 } as const;
export type InquiryField = keyof typeof inquiryLimits;
export type InquiryErrors = Partial<Record<InquiryField, string>>;

// Returns only fixed validation messages; never retains or echoes submitted content.
export function validateInquiry(
  input: Record<InquiryField, unknown>,
): InquiryErrors {
  const errors: InquiryErrors = {};
  for (const field of ["name", "email", "message"] as const) {
    const value = input[field];
    if (typeof value !== "string" || !value.trim()) {
      errors[field] = `Enter a ${field}.`;
    } else if (value.length > inquiryLimits[field]) {
      errors[field] = `Use ${inquiryLimits[field]} characters or fewer.`;
    }
  }
  if (
    !errors.email &&
    typeof input.email === "string" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  ) {
    errors.email = "Enter a valid email, such as homeowner@example.invalid.";
  }
  if (
    !errors.message &&
    typeof input.message === "string" &&
    input.message.trim().length < 10
  ) {
    errors.message = "Enter at least 10 characters for your message.";
  }
  return errors;
}
