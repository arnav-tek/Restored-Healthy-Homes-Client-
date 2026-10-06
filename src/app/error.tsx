"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container result-state" role="alert">
      <h1>We couldn’t load this page.</h1>
      <p>Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
