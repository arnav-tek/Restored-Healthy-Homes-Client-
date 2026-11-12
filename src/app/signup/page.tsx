import { notFound } from "next/navigation";
import { applicationMode } from "@/domain/config";
import { AuthPage } from "@/features/auth/auth-page";
export const metadata = { title: "Create account" };
export default function SignupPage() {
  if (applicationMode(process.env) !== "staging") notFound();
  return <AuthPage title="Create your account" action="signup" />;
}
