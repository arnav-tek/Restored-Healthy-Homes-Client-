"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
const links = [
  { href: "/directory", label: "Find Specialists" },
  { href: "/questions", label: "Ask a Specialist" },
  { href: "/consultations", label: "Consultations" },
  { href: "/education", label: "Certifications" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About Us" },
];
const subscribe = () => () => {};

export function NavigationView({ account }: { account: React.ReactNode }) {
  const route = usePathname();
  // Rewrites have a different server pathname; expose active state after hydration.
  const pathname =
    useSyncExternalStore(
      subscribe,
      () => route,
      () => "",
    ) ?? "";
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  return (
    <div
      className="navigation"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          close();
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="menu-toggle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <nav
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) close();
        }}
        id="primary-navigation"
        aria-label="Main navigation"
        className={open ? "nav-links is-open" : "nav-links"}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={close}
            aria-current={
              pathname === link.href ||
              (link.href === "/questions" && pathname.startsWith("/questions/"))
                ? "page"
                : undefined
            }
          >
            {link.label}
          </Link>
        ))}
        {account}
        <Link className="nav-cta" href="/list-your-business" onClick={close}>
          List Your Business
        </Link>
      </nav>
    </div>
  );
}
