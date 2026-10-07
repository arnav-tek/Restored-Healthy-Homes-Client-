"use client";

import { useRouter } from "next/navigation";
import { directoryHref, type SearchQuery } from "@/domain/directory-search";

export function SortBySelect({ query }: { query: SearchQuery }) {
  const router = useRouter();

  return (
    <div className="results-sort">
      <label htmlFor="top-sort-select" className="results-sort-label">
        Sort by
      </label>
      <select
        id="top-sort-select"
        value={query.sort}
        onChange={(e) => {
          const nextSort = e.target.value as SearchQuery["sort"];
          router.push(directoryHref({ ...query, sort: nextSort, page: 1 }));
        }}
        className="results-sort-select"
      >
        <option value="az">Business name: A–Z</option>
        <option value="za">Business name: Z–A</option>
        <option value="nearest">Nearest first</option>
      </select>
    </div>
  );
}
