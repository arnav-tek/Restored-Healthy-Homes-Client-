"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Form from "next/form";
import { useDemoReady } from "@/components/ui/use-demo-ready";

/** Keep restored browser drafts from overriding the server-validated URL state. */
export function SearchForm({
  children,
  className,
  label,
  action = "/directory",
}: {
  children: ReactNode;
  className?: string;
  label: string;
  action?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const ready = useDemoReady();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const restore = () => {
      // Browsers restore persisted form values after pageshow/popstate dispatch.
      clearTimeout(timer);
      timer = setTimeout(() => form.current?.reset(), 0);
    };
    const restoreCachedPage = (event: PageTransitionEvent) => {
      if (event.persisted) restore();
    };
    // A fresh page already has URL defaults; do not erase edits made before hydration.
    window.addEventListener("pageshow", restoreCachedPage);
    window.addEventListener("popstate", restore);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", restoreCachedPage);
      window.removeEventListener("popstate", restore);
    };
  }, []);

  return (
    <Form
      ref={form}
      action={action}
      className={className}
      aria-label={label}
      autoComplete="off"
      data-ready={ready}
    >
      {children}
    </Form>
  );
}
