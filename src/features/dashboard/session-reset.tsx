"use client";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoSession } from "@/features/member/demo-session";
export function SessionReset({ onReset }: { onReset?: () => void }) {
  const { dispatch } = useDemoSession();
  const ready = useDemoReady();
  return (
    <Button
      className="button-secondary"
      type="button"
      disabled={!ready}
      onClick={() => {
        if (
          !window.confirm(
            "Reset this demo session? Applications, questions, edits, review decisions and unsaved drafts will be discarded.",
          )
        )
          return;
        dispatch({ type: "reset" });
        onReset?.();
      }}
    >
      Reset demo session
    </Button>
  );
}
