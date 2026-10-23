"use client";
import Link from "next/link";
import type { Category } from "@/domain/categories";
import type { DemoLocation } from "@/domain/location";
import type { PublicProfessional } from "@/domain/professional";
import { directoryHref, type SearchResponse } from "@/domain/directory-search";
import {
  publicDirectoryCatalog,
  withPublicApplication,
} from "@/domain/public-application";
import { parseSearchQuery, type RawSearchParams } from "@/validation/directory";
import { useDemoSession } from "@/features/member/demo-session";
import { DirectoryFilters } from "./directory-filters";
import { DirectoryResults } from "./directory-results";
import { DirectoryUnavailable } from "./directory-state";

export function DirectoryContent({
  catalog,
  locations,
  params,
  response,
  professionals,
  unavailable,
}: {
  catalog: readonly Category[];
  locations: readonly DemoLocation[];
  params: RawSearchParams;
  response?: SearchResponse;
  professionals: readonly PublicProfessional[];
  unavailable: boolean;
}) {
  const { state } = useDemoSession();
  const currentCatalog = publicDirectoryCatalog(catalog, state);
  // The server can recognize a local category URL, but only this actual tab
  // catalog can accept it. Unknown/reset local IDs retain correction guidance.
  const { query, errors: validationErrors } = parseSearchQuery(
    params,
    currentCatalog,
  );
  const errors = {
    ...validationErrors,
    ...(response && !response.ok ? response.errors : {}),
  };
  const entries = Object.entries(errors);
  const results = response?.ok ? response.results : undefined;
  const title =
    currentCatalog.find((item) => item.id === query.category)?.name ??
    "All specialties";
  return (
    <div className="directory-layout">
      <DirectoryFilters
        key={directoryHref(query) + JSON.stringify(errors)}
        catalog={currentCatalog}
        locations={locations}
        query={query}
        errors={errors}
      />
      <section
        aria-label="Directory results"
        className="directory-results-section"
      >
        {(!results || entries.length > 0) && (
          <div className="results-heading">
            <div className="results-heading-title">
              <h2>{title}</h2>
              <p>Results unavailable</p>
            </div>
          </div>
        )}
        {unavailable ? (
          <DirectoryUnavailable href={directoryHref(query)} />
        ) : entries.length > 0 ? (
          <div className="result-state search-error" role="alert">
            <h2>Check your search</h2>
            <ul>
              {entries.map(([field, message]) => (
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
            professionals={withPublicApplication(professionals, state)}
            catalog={currentCatalog}
            locations={locations}
            query={query}
            origin={results.origin}
          />
        ) : null}
      </section>
    </div>
  );
}
