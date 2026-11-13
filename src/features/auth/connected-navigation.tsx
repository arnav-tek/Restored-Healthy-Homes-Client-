import Link from "next/link";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { loadAccountNavigation } from "@/data/supabase/account-workspace";
import { NavigationView } from "@/components/site/navigation-view";
import { AuthForm } from "./auth-form";

export async function ConnectedNavigation() {
  const state = await loadAccountNavigation(await createServerSupabaseClient());
  return (
    <NavigationView
      account={
        <>
          {state === "admin" && <Link href="/admin">Administration</Link>}
          {state === "member" && <Link href="/member">Your account</Link>}
          {state === "anonymous" && (
            <>
              <Link href="/login">Sign in</Link>
            </>
          )}
          {state === "unavailable" && (
            <Link href="/login">Account temporarily unavailable</Link>
          )}
          {state !== "anonymous" && (
            <AuthForm action="logout" presentation="navigation" />
          )}
        </>
      }
    />
  );
}
