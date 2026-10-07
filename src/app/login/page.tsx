import type { Metadata } from "next";
import Link from "next/link";
import { DemoLoginForm } from "@/features/demo-sign-in/login-form";
export const metadata: Metadata = {
  title: "Demo sign-in",
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
      <header className="demo-login-intro">
        <p className="section-label">Client walkthrough</p>
        <h1>Demo sign-in</h1>
        <p>
          Explore the professional and admin journeys using fictional accounts.
          This is a simulation, not authentication or secure account access.
        </p>
        <p className="field-help">
          Nothing entered here is sent or saved permanently. Refresh or a full
          reload resets this tab’s session. No account creation, password reset
          or email delivery is available.
        </p>
      </header>
      <DemoLoginForm
        returnTo={typeof params.returnTo === "string" ? params.returnTo : ""}
        account={typeof params.account === "string" ? params.account : ""}
      />
      <div className="login-public-links">
        <Link className="text-link" href="/directory">
          Browse professionals
        </Link>
        <Link className="text-link" href="/list-your-business">
          List Your Business
        </Link>
      </div>
    </div>
  );
}
