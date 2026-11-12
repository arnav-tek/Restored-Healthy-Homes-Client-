import Link from "next/link";

const sections = [
  ["/member", "Account"],
  ["/member/profile", "Profile"],
  ["/member/membership", "Membership"],
  ["/member/inquiries", "Inquiries"],
  ["/member/billing", "Billing"],
  ["/member/questions", "Questions"],
  ["/member/reviews", "Reviews"],
  ["/member/consultations", "Consultations"],
] as const;

export function ConnectedMemberNav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Member account"
      className="mb-6 flex flex-wrap gap-x-5 gap-y-3 text-sm"
    >
      {sections.map(([href, label]) => (
        <Link
          className={
            href === current
              ? "text-link underline underline-offset-4"
              : "text-link"
          }
          key={href}
          href={href}
          aria-current={href === current ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
