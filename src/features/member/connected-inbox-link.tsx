"use client";
import Link from "next/link";
import type { ReactNode } from "react";

/** Fetch a fresh private document instead of restoring a previously visited inbox. */
export function InboxReloadLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="text-link"
      href={href}
      prefetch={false}
      onNavigate={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </Link>
  );
}
