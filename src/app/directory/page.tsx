import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { directoryRepository, locationAdapter } from "@/data";
import { parseSearchQuery, type RawSearchParams } from "@/validation/directory";
import {
  DIRECTORY_PAGE_SIZE,
  directoryHref,
  type SearchResponse,
} from "@/domain/directory-search";
import { DirectoryFilters } from "@/features/directory/directory-filters";
import { ProfessionalCard } from "@/features/directory/professional-card";
import { Pagination } from "@/features/directory/pagination";
import {
  EmptyDirectory,
  DirectoryUnavailable,
} from "@/features/directory/directory-state";
export const metadata: Metadata = { title: "Find professionals" };
export default async function Directory({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [catalog, locations, params] = await Promise.all([
    directoryRepository.getCategories(),
    locationAdapter.listSupported(),
    searchParams,
  ]);
  const { query, errors: validationErrors } = parseSearchQuery(params, catalog);
  let response: SearchResponse | undefined;
  let unavailable = false;
  if (Object.keys(validationErrors).length === 0) {
    try {
      response = await directoryRepository.search(query);
    } catch {
      unavailable = true;
    }
  }
  const errors = {
    ...validationErrors,
    ...(response && !response.ok ? response.errors : {}),
  };
  const results = response?.ok ? response.results : undefined;
  // Canonicalize only successful searches. Invalid input keeps visible correction guidance.
  if (results) {
    const canonical = directoryHref({ ...query, page: results.page });
    const raw = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value))
        value.forEach((entry) => raw.append(key, entry));
      else if (value !== undefined) raw.set(key, value);
    }
    if (`/directory${raw.size ? `?${raw}` : ""}` !== canonical)
      redirect(canonical);
  }
  const title =
    catalog.find((category) => category.id === query.category)?.name ??
    "All specialties";
  const errorEntries = Object.entries(errors);
  return (
    <div className="container directory-page">
      <header className="page-heading">
        <p className="section-label">The professional directory</p>
        <h1>A healthier home. The right help.</h1>
        <p>Explore professionals by specialty, service and location.</p>
      </header>
      <div className="directory-layout">
        <DirectoryFilters
          key={directoryHref(query) + JSON.stringify(errors)}
          catalog={catalog}
          locations={locations}
          query={query}
          errors={errors}
        />
        <section aria-label="Directory results">
          <div className="results-heading">
            <div>
              <h2>{title}</h2>
              <p aria-live="polite">
                {results
                  ? results.total === 0
                    ? "0 matching professionals"
                    : `Showing ${(results.page - 1) * DIRECTORY_PAGE_SIZE + 1}–${Math.min(results.page * DIRECTORY_PAGE_SIZE, results.total)} of ${results.total} professionals`
                  : "Results unavailable"}
              </p>
            </div>
          </div>
          {unavailable ? (
            <DirectoryUnavailable href={directoryHref(query)} />
          ) : errorEntries.length > 0 ? (
            <div className="result-state search-error" role="alert">
              <h2>Check your search</h2>
              <ul>
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    {field === "page" ? (
                      message
                    ) : (
                      <a href={`#${field}`}>{message}</a>
                    )}
                  </li>
                ))}
              </ul>
              {response && !response.ok && response.suggestions ? (
                <div className="location-choices">
                  {response.suggestions.map((place) => (
                    <Link
                      className="button"
                      key={place.id}
                      href={directoryHref({
                        ...query,
                        location: `${place.city}, ${place.state}`,
                        page: 1,
                      })}
                    >
                      Search {place.city}, {place.state}
                    </Link>
                  ))}
                </div>
              ) : null}
              <Link className="text-link" href="/directory">
                Reset search
              </Link>
            </div>
          ) : results ? (
            <>
              {results.origin ? (
                <p className="search-context">
                  {query.radius === undefined
                    ? `In ${results.origin.city}, ${results.origin.state}.`
                    : `Within ${query.radius} miles of ${results.origin.city}, ${results.origin.state}.`}{" "}
                  Distances are approximate, measured between city centers, not
                  travel distances or service areas.
                  {results.missingCoordinates > 0
                    ? " Some matching listings lack coordinates; distance is unavailable and they are excluded from radius searches."
                    : ""}
                </p>
              ) : null}
              {results.hits.length === 0 ? (
                <EmptyDirectory />
              ) : (
                <div className="professional-grid">
                  {results.hits.map(({ professional, distanceMiles }) => (
                    <ProfessionalCard
                      key={professional.id}
                      professional={professional}
                      catalog={catalog}
                      distanceMiles={distanceMiles}
                      returnTo={directoryHref({ ...query, page: results.page })}
                    />
                  ))}
                </div>
              )}
              <Pagination
                query={query}
                page={results.page}
                pages={results.pages}
              />
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
