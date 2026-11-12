"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  validateAuth,
  newPasswordLimits,
  loginPasswordLimits,
  type AuthAction,
  type AuthErrors,
} from "@/validation/auth";
import { useDemoReady } from "@/components/ui/use-demo-ready";

const labels = {
  login: "Sign in",
  signup: "Create account",
  forgot: "Request reset email",
  reset: "Update password",
  logout: "Sign out",
};
export function AuthForm({
  action,
  returnTo = "/member",
  presentation = "page",
}: {
  action: AuthAction;
  returnTo?: string;
  presentation?: "page" | "navigation";
}) {
  const ready = useDemoReady();
  const passwordLimits =
    action === "login" ? loginPasswordLimits : newPasswordLimits;
  const [pending, setPending] = useState(false),
    [errors, setErrors] = useState<AuthErrors>({}),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const issues = validateAuth(action, fields);
    setErrors(issues);
    setFailure("");
    setMessage("");
    if (Object.keys(issues).length) {
      formRef.current
        ?.querySelector<HTMLInputElement>(`[name="${Object.keys(issues)[0]}"]`)
        ?.focus();
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, returnTo }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? {});
        setFailure(data.error ?? "Check the highlighted fields.");
        return;
      }
      formRef.current?.reset();
      if (data.redirect) {
        if (
          (action === "logout" || action === "reset") &&
          typeof BroadcastChannel !== "undefined"
        ) {
          const channel = new BroadcastChannel("rhh-auth");
          channel.postMessage("signed-out");
          channel.close();
        }
        window.location.replace(data.redirect);
        return;
      }
      setMessage(data.message ?? "Request completed.");
    } catch {
      setFailure("Could not connect. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      ref={formRef}
      className={
        presentation === "navigation"
          ? "inline-flex max-w-full items-center"
          : "demo-login-form"
      }
      method="post"
      action={`/api/auth/${action}`}
      onSubmit={submit}
      noValidate
      aria-busy={pending}
    >
      <fieldset
        disabled={!ready || pending}
        className={
          presentation === "navigation"
            ? "m-0 inline-flex min-w-0 border-0 p-0"
            : "member-form-fields"
        }
      >
        <legend className="sr-only">Account details</legend>
        {failure && (
          <p role="alert" className="form-error">
            {failure}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {["login", "signup", "forgot"].includes(action) && (
          <div className="search-field">
            <label htmlFor={`${action}-email`}>Email address</label>
            <input
              id={`${action}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              aria-invalid={!!errors.email}
              aria-describedby={
                errors.email ? `${action}-email-error` : undefined
              }
            />
            {errors.email && (
              <p id={`${action}-email-error`} className="field-error">
                {errors.email}
              </p>
            )}
          </div>
        )}
        {["login", "signup", "reset"].includes(action) && (
          <div className="search-field">
            <label htmlFor={`${action}-password`}>
              {action === "reset" ? "New password" : "Password"}
            </label>
            <input
              id={`${action}-password`}
              name="password"
              type="password"
              autoComplete={
                action === "login" ? "current-password" : "new-password"
              }
              required
              minLength={passwordLimits.min}
              maxLength={passwordLimits.max}
              aria-invalid={!!errors.password}
              aria-describedby={`${action}-password-help`}
            />
            <p
              id={`${action}-password-help`}
              className={errors.password ? "field-error" : "field-help"}
            >
              {errors.password ??
                (action === "login"
                  ? "Enter your account password."
                  : `Use ${newPasswordLimits.min}–${newPasswordLimits.max} characters. Choose a unique password.`)}
            </p>
          </div>
        )}
        {["signup", "reset"].includes(action) && (
          <div className="search-field">
            <label htmlFor={`${action}-confirm`}>Confirm password</label>
            <input
              id={`${action}-confirm`}
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={newPasswordLimits.min}
              maxLength={newPasswordLimits.max}
              aria-invalid={!!errors.confirm}
              aria-describedby={
                errors.confirm ? `${action}-confirm-error` : undefined
              }
            />
            {errors.confirm && (
              <p className="field-error" id={`${action}-confirm-error`}>
                {errors.confirm}
              </p>
            )}
          </div>
        )}
        <button
          className={
            presentation === "navigation"
              ? "text-link bg-transparent p-0"
              : "button login-submit"
          }
          disabled={!ready || pending}
          type="submit"
        >
          {pending ? "Please wait…" : labels[action]}
        </button>
        {action === "login" && (
          <p>
            <Link href="/forgot-password">Forgot password?</Link> ·{" "}
            <Link href="/signup">Create an account</Link>
          </p>
        )}
        {action !== "login" && action !== "logout" && (
          <p>
            <Link href="/login">Back to sign in</Link>
          </p>
        )}
        <noscript>
          JavaScript is required to securely submit this form.
        </noscript>
      </fieldset>
    </form>
  );
}
