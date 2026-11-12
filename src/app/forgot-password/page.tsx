import { notFound } from "next/navigation";
import { applicationMode } from "@/domain/config";
import { AuthPage } from "@/features/auth/auth-page";
export const metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() {
  if (applicationMode(process.env) !== "staging") notFound();
  return <AuthPage title="Reset your password" action="forgot" />;
}
