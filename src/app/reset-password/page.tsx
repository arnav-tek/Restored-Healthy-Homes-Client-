import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { applicationMode } from "@/domain/config";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import {
  recoveryCookie,
  validRecoveryGrant,
} from "@/data/supabase/auth-config";
import { AuthPage } from "@/features/auth/auth-page";
export const metadata = { title: "Choose a new password" };
export default async function ResetPasswordPage() {
  if (applicationMode(process.env) !== "staging") notFound();
  const identity = await authenticatedIdentity(
    await createServerSupabaseClient(),
  );
  if (
    !identity ||
    !validRecoveryGrant(
      (await cookies()).get(recoveryCookie)?.value,
      identity.id,
    )
  )
    redirect("/login?notice=link-invalid");
  return <AuthPage title="Choose a new password" action="reset" />;
}
