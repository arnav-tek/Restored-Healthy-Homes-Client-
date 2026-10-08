"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import {
  demoAccounts,
  demoDashboard,
  demoPasscode,
} from "@/domain/demo-identity";
import {
  parseDemoSignIn,
  safeDemoReturn,
  type DemoSignInErrors,
} from "@/validation/demo-sign-in";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoSession } from "@/features/member/demo-session";
import { SignOutButton } from "./sign-out-button";
export function DemoLoginForm({
  returnTo,
  account,
  area = "member",
}: {
  returnTo: string;
  account: string;
  area?: "member" | "admin";
}) {
  const { state, dispatch, drafts } = useDemoSession();
  const accounts = demoAccounts(state.applicationId);
  const [showCode, setShowCode] = useState(false);
  const shortcuts = useRef<HTMLDetailsElement>(null);
  const [email, setEmail] = useState(
    () => accounts.find((item) => item.id === account && item.identity.kind === area)?.email ?? "",
  );
  const [passcode, setPasscode] = useState("");
  const [errors, setErrors] = useState<DemoSignInErrors>({});
  const emailRef = useRef<HTMLInputElement>(null),
    passcodeRef = useRef<HTMLInputElement>(null);
  const ready = useDemoReady();
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || state.identity) return;
    const result = parseDemoSignIn({ email, passcode }, state.applicationId);
    if (!result.ok) {
      setErrors(result.errors);
      (result.errors.email ? emailRef : passcodeRef).current?.focus();
      return;
    }
    if (result.identity.kind !== area) {
      setErrors({ email: area === "admin"
        ? "Use an administrator account for this sign-in page."
        : "Use a professional account for this sign-in page." });
      emailRef.current?.focus();
      return;
    }
    if (
      Object.keys(drafts).length &&
      !window.confirm(
        "Start this account? Unsaved drafts will be discarded. Submitted records remain in this tab.",
      )
    )
      return;
    dispatch({ type: "demo-sign-in", fields: { email, passcode } });
    setEmail("");
    setPasscode("");
    setErrors({});
    router.replace(safeDemoReturn(returnTo, result.identity));
  }
  if (ready && state.identity)
    return (
      <section className="panel login-current">
        <h2>You’re already signed in</h2>
        <p>
          {
            accounts.find((item) => item.id === state.identity?.accountId)
              ?.label
          }
          . Continue to your workspace or switch accounts.
        </p>
        <div className="filter-actions">
          <Link className="button" href={demoDashboard(state.identity)}>
            Open your dashboard
          </Link>
          <SignOutButton
            label="Switch account"
            returnTo={returnTo || undefined}
          />
        </div>
      </section>
    );
  return (
    <div className="login-access">
      <form
        className="demo-login-form"
        noValidate
        onSubmit={submit}
        autoComplete="off"
      >
        <h2 className="sr-only">{area === "member" ? "Professional access" : "Administrator access"}</h2>
        <p className="login-access-description">
          {area === "member" ? "Manage your professional profile and inquiries." : "Manage applications, listings and directory activity."}
        </p>
        <fieldset disabled={!ready} className="member-form-fields">
          <legend className="sr-only">Sign-in details</legend>
          <div className="search-field">
            <label htmlFor="demo-email">Account email</label>
            <input
              ref={emailRef}
              id="demo-email"
              type="email"
              maxLength={254}
              autoComplete="off"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby="demo-email-error"
            />
            <p className="field-error" id="demo-email-error">
              {errors.email}
            </p>
          </div>
          <div className="search-field">
            <label htmlFor="demo-passcode">Access code</label>
            <div className="login-code-field"><input
              ref={passcodeRef}
              id="demo-passcode"
              type={showCode ? "text" : "password"}
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              aria-invalid={!!errors.passcode}
              aria-describedby="demo-passcode-error"
            />
            <button type="button" className="login-code-toggle" aria-label={showCode ? "Hide code" : "Show code"}
              aria-pressed={showCode} onClick={() => setShowCode(!showCode)}>
              {showCode ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
            </button></div>
            <p className="field-error" id="demo-passcode-error">
              {errors.passcode}
            </p>
          </div>
          <button type="submit" className="button login-submit">
            Sign in <ArrowRight size={18} aria-hidden="true" />
          </button>
        </fieldset>
        <noscript>
          Enable JavaScript to sign in. Controls are disabled; nothing
          is submitted.
        </noscript>
        <p role="status" className="field-error">
          {Object.keys(errors).length
            ? "Check the highlighted fields. No account has been selected."
            : ""}
        </p>
      </form>
      <details className="login-shortcuts" ref={shortcuts}>
        <summary>Quick access</summary>
        <p>Select a workspace to fill in the sign-in details.</p>
        <ul>
          {accounts.filter((item) => item.identity.kind === area).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="text-link"
                aria-label={`Use ${item.label}`}
                disabled={!ready}
                onClick={() => {
                  setEmail(item.email);
                  setPasscode(demoPasscode);
                  setErrors({});
                  if (shortcuts.current) shortcuts.current.open = false;
                  emailRef.current?.focus();
                }}
              >
                <span>Use {item.label}</span>
                <span className="login-shortcut-description">{item.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
