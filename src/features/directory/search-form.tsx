"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Keep restored browser drafts from overriding the server-validated URL state. */
export function SearchForm({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.reset();
    let timer: ReturnType<typeof setTimeout>;
    const restore = () => {
      // Browsers restore persisted form values after pageshow/popstate dispatch.
      clearTimeout(timer);
      timer = setTimeout(() => form.current?.reset(), 0);
    };
    window.addEventListener("pageshow", restore);
    window.addEventListener("popstate", restore);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("popstate", restore);
    };
  }, []);

  return (
    <form
      ref={form}
      action="/directory"
      method="get"
      className={className}
      aria-label={label}
      autoComplete="off"
    >
      {children}
    </form>
  );
}
