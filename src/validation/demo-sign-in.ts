import {
  demoAccounts,
  demoPasscode,
  type DemoIdentity,
} from "../domain/demo-identity";
import {
  dashboardHref,
  dashboardSections,
  parseDashboardQuery,
} from "./dashboard";
export interface DemoSignInFields {
  email: string;
  passcode: string;
}
export type DemoSignInErrors = Partial<Record<keyof DemoSignInFields, string>>;
export function parseDemoSignIn(
  input: Record<string, unknown>,
  applicationId: string | null,
):
  | { ok: true; identity: DemoIdentity }
  | { ok: false; errors: DemoSignInErrors } {
  const errors: DemoSignInErrors = {};
  const email =
    typeof input.email === "string" && input.email.length <= 254
      ? input.email.trim().toLowerCase()
      : "";
  const account = demoAccounts(applicationId).find(
    (item) => item.email === email,
  );
  if (!account)
    errors.email =
      "Choose an account below and use its displayed email.";
  if (
    typeof input.passcode !== "string" ||
    input.passcode.length > 64 ||
    input.passcode !== demoPasscode
  )
    errors.passcode = `Use the public passcode: ${demoPasscode}. Do not enter a real password.`;
  return account && !Object.keys(errors).length
    ? { ok: true, identity: { ...account.identity } }
    : { ok: false, errors };
}
// A sign-in return is only a canonical dashboard path for that identity. No arbitrary URLs.
export function safeDemoReturn(value: unknown, identity: DemoIdentity): string {
  const fallback = `/demo/${identity.kind}`;
  if (
    typeof value !== "string" ||
    value.length > 1000 ||
    /[\\#\s\u0000-\u001f\u007f]/.test(value)
  )
    return fallback;
  let url: URL;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value)))
      return fallback;
    url = new URL(value, "https://demo.invalid");
  } catch {
    return fallback;
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    url.origin !== "https://demo.invalid" ||
    url.pathname !== fallback ||
    value.split("?")[0] !== fallback
  )
    return fallback;
  const keys = [
    "review",
    "reviewStatus",
    "professional",
    "section",
    "record",
    "q",
    "status",
    "suspension",
    "category",
    "question",
    "answer",
    "queue",
    "qaStatus",
    "consultation",
    "consultationStatus",
    "assignment",
  ];
  for (const [key] of url.searchParams)
    if (!keys.includes(key) || url.searchParams.getAll(key).length !== 1)
      return fallback;
  const section = url.searchParams.get("section");
  if (
    section &&
    !(dashboardSections[identity.kind] as readonly string[]).includes(section)
  )
    return fallback;
  const query = parseDashboardQuery(identity.kind, url.searchParams);
  if (identity.kind === "member") query.record = ""; // Identity is never selected by return parameters.
  return dashboardHref(identity.kind, query);
}
export function demoLoginHref(returnTo: string): string {
  const login = returnTo.split("?")[0] === "/demo/admin" ? "/admin/login" : "/login";
  return `${login}?returnTo=${encodeURIComponent(returnTo)}`;
}
