import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, House } from "lucide-react";
import { DemoLoginForm } from "@/features/demo-sign-in/login-form";
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="container demo-login-page">
      <div className="login-shell">
        <aside className="login-story">
          <span className="login-story-mark"><House size={28} aria-hidden="true" /></span>
          <div>
            <p className="login-eyebrow">Restored Healthy Homes</p>
            <h2>Good connections.<br />Healthier homes.</h2>
            <p>Your work has a place here. Keep your profile, conversations and next steps together.</p>
          </div>
          <Link href="/directory">Browse professionals <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </aside>
        <section className="login-panel" aria-labelledby="login-heading">
          <header className="demo-login-intro">
            <p className="section-label">Welcome back</p>
            <h1 id="login-heading">Sign in</h1>
          </header>
          <DemoLoginForm
            returnTo={typeof params.returnTo === "string" ? params.returnTo : ""}
            account={typeof params.account === "string" ? params.account : ""}
          />
          <div className="login-join">
            <p>New to the directory? <Link href="/list-your-business">List Your Business <ArrowUpRight size={15} aria-hidden="true" /></Link></p>
            <Link className="login-browse" href="/directory">Browse professionals without signing in</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
