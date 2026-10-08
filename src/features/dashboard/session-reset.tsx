"use client";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useDemoSession } from "@/features/member/demo-session";

export function SessionReset({ onReset }: { onReset?: () => void }) {
  const { dispatch } = useDemoSession();
  const ready = useDemoReady();
  return (
    <Button
      className="button-secondary reset-session-btn"
      type="button"
      disabled={!ready}
      onClick={() => {
        if (
          !window.confirm(
            "Reset this workspace? You will be signed out. Applications, questions, answers, reviews, consultation requests, edits, review decisions and unsaved drafts will be discarded.",
          )
        )
          return;
        dispatch({ type: "reset" });
        onReset?.();
      }}
    >
      <RotateCcw size={14} aria-hidden="true" />
      <span>Reset workspace</span>
    </Button>
  );
}
