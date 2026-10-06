"use client";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <div className="container result-state" role="alert">
      <h1>The profile couldn’t load</h1>
      <p>Try again or return to the directory.</p>
      <div className="filter-actions">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/directory">Open directory</ButtonLink>
      </div>
    </div>
  );
}
