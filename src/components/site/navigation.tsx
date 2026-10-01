"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
const links = [
  { href: "/", label: "Home" },
  { href: "/directory", label: "Find professionals" },
  { href: "/questions", label: "Ask a Specialist" },
  { href: "/demo/member", label: "Member preview" },
];
export function Navigation() {
  const pathname = usePathname();
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
        <Link className="nav-cta" href="/list-your-business" onClick={close}>
          List Your Business
        </Link>
      </nav>
    </div>
  );
}
