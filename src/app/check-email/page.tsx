import Link from "next/link";
import { notFound } from "next/navigation";
import { applicationMode } from "@/domain/config";
import { AuthPage } from "@/features/auth/auth-page";

export const metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  if (applicationMode(process.env) !== "staging") notFound();
  return (
    <AuthPage title="Check your email">
      <div className="grid gap-5">
        <p>
          Look for the newest confirmation email and open its link in this
          browser to verify your address.
        </p>
        <p className="field-help">
          Check your spam folder too. Delivery may take a few minutes. Only use
          the latest link; it works once.
        </p>
        <p>Already verified your address, or already have an account?</p>
        <Link className="button login-submit" href="/login">
          Continue to sign in
        </Link>
      </div>
    </AuthPage>
  );
}
