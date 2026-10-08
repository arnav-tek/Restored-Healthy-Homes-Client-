"use client";
import { useRouter } from "next/navigation";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoSession } from "@/features/member/demo-session";
import { demoLoginHref } from "@/validation/demo-sign-in";
export function SignOutButton({
  label = "Sign out",
  returnTo,
  className = "text-link",
  onSignedOut,
}: {
  label?: string;
  returnTo?: string;
  className?: string;
  onSignedOut?: () => void;
}) {
  const { state, dispatch, drafts } = useDemoSession();
  const ready = useDemoReady();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      disabled={!ready}
      onClick={() => {
        if (
          !ready ||
          (Object.keys(drafts).length &&
            !window.confirm(
              "Sign out of this account? Unsaved drafts will be discarded. Submitted records remain in this tab.",
            ))
        )
          return;
        dispatch({ type: "demo-sign-out" });
        onSignedOut?.();
        router.replace(returnTo ? demoLoginHref(returnTo) : state.identity?.kind === "admin" ? "/admin/login" : "/login");
      }}
    >
      {label}
    </button>
  );
}
