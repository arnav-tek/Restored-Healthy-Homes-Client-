"use client";
import Link from "next/link";
import { useDemoSession } from "@/features/member/demo-session";
import { demoDashboard } from "@/domain/demo-identity";
import { SignOutButton } from "@/features/demo-sign-in/sign-out-button";
import { NavigationView } from "./navigation-view";
export function Navigation() {
  const { state } = useDemoSession();
  return (
    <NavigationView
      account={
        state.identity ? (
          <>
            <Link
              href={demoDashboard(state.identity)}
              data-demo-account={state.identity.accountId}
            >
              Dashboard
            </Link>
            <SignOutButton className="nav-sign-out" />
          </>
        ) : (
          <Link href="/login">Sign in</Link>
        )
      }
    />
  );
}
