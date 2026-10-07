"use client";

import { useRouter } from "next/navigation";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { directoryHref, type SearchQuery } from "@/domain/directory-search";
import { SearchForm } from "./search-form";

export function SortBySelect({ query }: { query: SearchQuery }) {
  const router = useRouter();
  const ready = useDemoReady();
  // Preserve all active filters in the native GET fallback; sorting starts at page one.
  const filters = new URLSearchParams(
    directoryHref({ ...query, sort: "az", page: 1 }).split("?")[1],
  );

  return (
    <SearchForm className="results-sort" label="Sort directory results">
      {Array.from(filters, ([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="top-sort-select" className="results-sort-label">
        Sort by
      </label>
      <select
        id="top-sort-select"
        name="sort"
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
      {!ready && (
        <button className="button button-secondary" type="submit">
          Apply sort
        </button>
      )}
    </SearchForm>
  );
}
