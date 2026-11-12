import Link from "next/link";
import type { InboxPage } from "@/domain/inbox";
import { inquiryDate } from "./inquiry-date";

export function ConnectedInboxList({ inbox }: { inbox: InboxPage }) {
  const { page } = inbox;
  return (
    <>
      {inbox.items.length ? (
        <ul className="connected-inbox-list" aria-label="Saved inquiries">
          {inbox.items.map((item) => (
            <li key={item.id} className="connected-inbox-card min-w-0">
              <Link
                className="text-link"
                href={`/member/inquiries/${item.id}`}
                prefetch={false}
              >
                Inquiry from {item.name}
              </Link>
              <p>
                <strong>{item.readAt ? "Read" : "Unread"}</strong> ·{" "}
                <time dateTime={item.createdAt}>
                  {inquiryDate(item.createdAt)}
                </time>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="workspace-empty">
          <h2>{page > 1 ? "No inquiries on this page" : "No inquiries yet"}</h2>
          <p>
            Messages appear here when a visitor contacts your published listing.
            Opening a message does not mark it read; use its read-state button.
          </p>
          <Link className="text-link" href="/member/membership">
            Check your listing availability
          </Link>
        </div>
      )}
      <nav
        className="flex flex-wrap items-center gap-4 mt-6"
        aria-label="Inbox pages"
      >
        {page > 1 && (
          <Link
            className="text-link"
            href={`/member/inquiries?page=${page - 1}`}
            prefetch={false}
          >
            Previous page
          </Link>
        )}
        <span>Page {page}</span>
        {inbox.hasNext && (
          <Link
            className="text-link"
            href={`/member/inquiries?page=${page + 1}`}
            prefetch={false}
          >
            Next page
          </Link>
        )}
      </nav>
    </>
  );
}
