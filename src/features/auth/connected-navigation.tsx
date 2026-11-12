import Link from "next/link";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { loadAccountNavigation } from "@/data/supabase/account-workspace";
import { AuthForm } from "./auth-form";

export async function ConnectedNavigation() {
  const state = await loadAccountNavigation(await createServerSupabaseClient());
  return (
    <nav
      aria-label="Account navigation"
      className="flex flex-wrap items-center gap-x-5 gap-y-3"
    >
      <Link href="/directory">Find professionals</Link>
      {state === "admin" && <Link href="/admin">Administration</Link>}
      {state === "member" && <Link href="/member">Your account</Link>}
      {state === "anonymous" && (
        <>
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
        </>
      )}
      {state === "unavailable" && (
        <Link href="/login">Account temporarily unavailable</Link>
      )}
      {state !== "anonymous" && (
        <AuthForm action="logout" presentation="navigation" />
      )}
    </nav>
  );
}
