import type { ReactNode } from "react";
import { House } from "lucide-react";
import { AuthForm } from "./auth-form";
import type { AuthAction } from "@/validation/auth";
export function AuthPage({
  title,
  action,
  notice,
  returnTo,
  children,
}: {
  title: string;
  action?: AuthAction;
  children?: ReactNode;
  notice?: string;
  returnTo?: string;
}) {
  return (
    <div className="container demo-login-page">
      <div className="login-shell">
        <aside className="login-story">
          <span className="login-story-mark">
            <House size={28} aria-hidden="true" />
          </span>
          <div>
            <p className="login-eyebrow section-tag section-tag-inverse">
              Restored Healthy Homes
            </p>
            <h2>
              Good connections.
              <br />
              Healthier homes.
            </h2>
            <p>
              Sign in to save your application and manage your business profile.
            </p>
          </div>
        </aside>
        <section className="login-panel" aria-labelledby="auth-heading">
          <header className="demo-login-intro">
            <h1 id="auth-heading">{title}</h1>
          </header>
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          {action ? <AuthForm action={action} returnTo={returnTo} /> : children}
        </section>
      </div>
    </div>
  );
}
