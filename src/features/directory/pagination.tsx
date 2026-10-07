import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { directoryHref, type SearchQuery } from "@/domain/directory-search";

export function Pagination({
  query,
  page,
  pages,
}: {
  query: SearchQuery;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Results pages">
      {page > 1 ? (
        <Link
          className="button pagination-link pagination-arrow pagination-prev"
          href={directoryHref({ ...query, page: page - 1 })}
          aria-label="Previous page"
        >
          <span className="sr-only">Previous page</span>
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span
          className="pagination-arrow pagination-disabled"
          aria-hidden="true"
        >
          <ChevronLeft size={16} />
        </span>
      )}
      <span className="pagination-label" aria-current="page">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link
          className="button pagination-link pagination-arrow pagination-next"
          href={directoryHref({ ...query, page: page + 1 })}
          aria-label="Next page"
        >
          <span className="sr-only">Next page</span>
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span
          className="pagination-arrow pagination-disabled"
          aria-hidden="true"
        >
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
