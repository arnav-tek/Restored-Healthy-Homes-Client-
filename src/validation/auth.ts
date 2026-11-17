import { inquiryUuid } from "./connected-inquiry";
import { validateInquiry } from "./inquiry";
export const newPasswordLimits = { min: 8, max: 16 } as const;
export const loginPasswordLimits = { min: 1, max: 128 } as const;

export type AuthAction = "login" | "signup" | "forgot" | "reset" | "logout";
export type AuthErrors = Partial<
  Record<"email" | "password" | "confirm", string>
>;
export function safeAuthReturn(value: unknown): string {
  // Exact allowlist; encoded URLs, query strings and external URLs are excluded.
  return typeof value === "string" &&
    ([
      "/",
      "/admin",
      "/admin/applications",
      "/admin/listings",
      "/admin/categories",
      "/admin/content",
      "/admin/featured",
      "/admin/reports",
      "/admin/credentials",
      "/admin/notifications",
      "/admin/questions",
      "/admin/reviews",
      "/admin/consultations",
      "/member",
      "/member/profile",
      "/member/reviews",
      "/member/membership",
      "/member/inquiries",
      "/member/questions",
      "/member/consultations",
      "/member/billing",
      "/list-your-business",
    ].includes(value) ||
      [
        "/member/questions/",
        "/member/inquiries/",
        "/admin/applications/",
        "/admin/listings/",
      ].some(
        (prefix) =>
          value.startsWith(prefix) &&
          inquiryUuid.test(value.slice(prefix.length)),
      ))
    ? value
    : "/member";
}
export function validateAuth(
  action: AuthAction,
  fields: Record<string, unknown>,
): AuthErrors {
  const errors: AuthErrors = {};
  if (["login", "signup", "forgot"].includes(action)) {
    const emailError = validateInquiry({
      name: "Auth",
      email: fields.email,
      message: "Authentication request",
    }).email;
    if (emailError)
      errors.email = "Enter a valid email address (254 characters or fewer).";
  }
  if (["login", "signup", "reset"].includes(action)) {
    const { min, max } =
      action === "login" ? loginPasswordLimits : newPasswordLimits;
    if (
      typeof fields.password !== "string" ||
      fields.password.length < min ||
      fields.password.length > max
    )
      errors.password = `Use ${min}–${max} characters for your password.`;
  }
  if (
    ["signup", "reset"].includes(action) &&
    fields.confirm !== fields.password
  )
    errors.confirm = "Passwords must match.";
  return errors;
}

/** Routing hint only; every destination still validates identity and database role. */
export function accountReturnPath(role: "admin" | "member", value: unknown) {
  const path = safeAuthReturn(value);
  if (path === "/") return path;
  const adminPath = path === "/admin" || path.startsWith("/admin/");
  if (role === "admin") return adminPath ? path : "/admin";
  return adminPath ? "/member" : path;
}
