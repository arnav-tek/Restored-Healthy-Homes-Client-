import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, House } from "lucide-react";
import { DemoLoginForm } from "@/features/demo-sign-in/login-form";
export const metadata: Metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false },
};
export default async function AdminLoginPage({
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
            <p className="login-eyebrow section-tag section-tag-inverse">Restored Healthy Homes</p>
            <h2>A well-managed directory.<br />A stronger community.</h2>
            <p>Review applications, manage listings and support your professional community.</p>
          </div>
          <Link href="/directory">Browse professionals <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </aside>
        <section className="login-panel" aria-labelledby="login-heading">
          <header className="demo-login-intro">
            <p className="section-label section-tag">Administration</p>
            <h1 id="login-heading">Sign in</h1>
          </header>
          <DemoLoginForm
            area="admin"
            returnTo={typeof params.returnTo === "string" ? params.returnTo : ""}
            account={typeof params.account === "string" ? params.account : ""}
          />

        </section>
      </div>
    </div>
  );
}
