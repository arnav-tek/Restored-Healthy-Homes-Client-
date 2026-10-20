import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { directoryRepository, locationAdapter } from "@/data";
import { parseSearchQuery, type RawSearchParams } from "@/validation/directory";
import { directoryHref, type SearchResponse } from "@/domain/directory-search";
import { DirectoryFilters } from "@/features/directory/directory-filters";
import { DirectoryResults } from "@/features/directory/directory-results";
import type { PublicProfessional } from "@/domain/professional";
import { DirectoryUnavailable } from "@/features/directory/directory-state";
export const metadata: Metadata = { title: "Find Specialists" };
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
  let professionals: PublicProfessional[] = [];
  if (Object.keys(validationErrors).length === 0) {
    try {
      [response, professionals] = await Promise.all([
        directoryRepository.search(query),
        directoryRepository.listPublic(),
      ]);
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
    const canonical = directoryHref({
      ...query,
      page: query.minRating === undefined ? results.page : query.page,
    });
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
      <header className="page-heading directory-hero">
        <p className="directory-eyebrow section-tag">
          {" "}
          THE PROFESSIONAL DIRECTORY
        </p>
        <h1 className="directory-title">A healthier home. The right help.</h1>
        <p className="directory-subtitle">
          Explore professionals by specialty, service and location.
        </p>
      </header>
      <div className="directory-layout">
        <DirectoryFilters
          key={directoryHref(query) + JSON.stringify(errors)}
          catalog={catalog}
          locations={locations}
          query={query}
          errors={errors}
        />
        <section
          aria-label="Directory results"
          className="directory-results-section"
        >
          {!results && (
            <div className="results-heading">
              <div className="results-heading-title">
                <h2>{title}</h2>
                <p>Results unavailable</p>
              </div>
            </div>
          )}
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
            <DirectoryResults
              professionals={professionals}
              catalog={catalog}
              locations={locations}
              query={query}
              origin={results.origin}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
