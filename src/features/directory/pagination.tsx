import Link from "next/link";
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
          className="button pagination-link"
          href={directoryHref({ ...query, page: page - 1 })}
        >
          Previous page
        </Link>
      ) : (
        <span />
      )}
      <span aria-current="page">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link
          className="button pagination-link"
          href={directoryHref({ ...query, page: page + 1 })}
        >
          Next page
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
