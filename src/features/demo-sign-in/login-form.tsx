"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
}: {
  returnTo: string;
  account: string;
}) {
  const { state, dispatch, drafts } = useDemoSession();
  const accounts = demoAccounts(state.applicationId);
  const [email, setEmail] = useState(
    () => accounts.find((item) => item.id === account)?.email ?? "",
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
    if (
      Object.keys(drafts).length &&
      !window.confirm(
        "Start this demo account? Unsaved drafts will be discarded. Submitted fictional records remain in this tab.",
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
        <h2>A demo account is already selected</h2>
        <p>
          {
            accounts.find((item) => item.id === state.identity?.accountId)
              ?.label
          }
          . To change accounts, sign out first. This keeps submitted demo
          records and clears unsaved drafts.
        </p>
        <div className="filter-actions">
          <Link className="button" href={demoDashboard(state.identity)}>
            Open your dashboard
          </Link>
          <SignOutButton
            label="Switch demo account"
            returnTo={returnTo || undefined}
          />
        </div>
      </section>
    );
  return (
    <div className="demo-login-layout">
      <form
        className="panel demo-login-form"
        noValidate
        onSubmit={submit}
        autoComplete="off"
      >
        <h2>Try an account</h2>
        <p>
          Use a fictional email below and the public passcode{" "}
          <strong>{demoPasscode}</strong>. Do not enter real credentials.
        </p>
        <fieldset disabled={!ready} className="member-form-fields">
          <legend className="sr-only">Demo sign-in credentials</legend>
          <div className="search-field">
            <label htmlFor="demo-email">Demo account email</label>
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
            <label htmlFor="demo-passcode">Public demo passcode</label>
            <input
              ref={passcodeRef}
              id="demo-passcode"
              type="text"
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              aria-invalid={!!errors.passcode}
              aria-describedby="demo-passcode-help demo-passcode-error"
            />
            <p id="demo-passcode-help" className="field-help">
              Not a real password. Use {demoPasscode} for every demo account.
            </p>
            <p className="field-error" id="demo-passcode-error">
              {errors.passcode}
            </p>
          </div>
          <button type="submit" className="button">
            Sign in to demo
          </button>
        </fieldset>
        <noscript>
          Enable JavaScript to simulate sign-in. Controls are disabled; nothing
          is submitted.
        </noscript>
        <p role="status" className="field-error">
          {Object.keys(errors).length
            ? "Check the highlighted fields. No account has been selected."
            : ""}
        </p>
      </form>
      <section
        className="demo-account-presets"
        aria-labelledby="demo-accounts-heading"
      >
        <h2 id="demo-accounts-heading">Fictional accounts</h2>
        <p>
          Presets describe the original examples. Approval and other demo
          decisions can change during this tab’s walkthrough.
        </p>
        <ul>
          {accounts.map((item) => (
            <li key={item.id}>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
              <p className="demo-account-email">{item.email}</p>
              <button
                type="button"
                className="text-link"
                disabled={!ready}
                onClick={() => {
                  setEmail(item.email);
                  setPasscode(demoPasscode);
                  setErrors({});
                  emailRef.current?.focus();
                }}
              >
                Use {item.label}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
