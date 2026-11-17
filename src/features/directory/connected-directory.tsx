import Link from "next/link";
import { connectedDirectory } from "@/data/supabase/public-directory";
import { searchConnectedDirectory } from "@/data/locations/directory";
import { parseSearchQuery, type RawSearchParams } from "@/validation/directory";
import { directoryHref } from "@/domain/directory-search";
import { ConnectedSearchForm } from "./connected-search-form";
import { ResultsMap } from "./results-map";
import { ProfessionalCard } from "./professional-card";
export async function ConnectedDirectory({
  params,
}: {
  params: RawSearchParams;
}) {
  let catalog;
  try {
    catalog = await connectedDirectory.getCategories();
  } catch {
    return (
      <div className="container directory-page">
        <h1>Find professionals</h1>
        <p role="alert">
          The directory is temporarily unavailable. Please try again later.
        </p>
        <Link href="/directory">Try again</Link>
      </div>
    );
  }
  const { query, errors } = parseSearchQuery(params, catalog);
  if (params.latitude !== undefined || params.longitude !== undefined)
    errors.location =
      "Choose a city or ZIP using the location controls; raw coordinates are not accepted.";
  let results: Awaited<ReturnType<typeof searchConnectedDirectory>> | undefined;
  let failure = Object.values(errors).join(" ");
  if (!failure) {
    try {
      results = await searchConnectedDirectory(query);
    } catch (e) {
      failure =
        e instanceof Error
          ? e.message
          : "The directory is temporarily unavailable.";
    }
  }
  return (
    <div className="container directory-page">
      <header className="page-heading directory-hero">
        <p className="section-tag">Restored Healthy Homes</p>
        <h1>Find professionals</h1>
        <p>Explore approved professionals with active membership.</p>
      </header>
      <ConnectedSearchForm
        key={directoryHref(query)}
        catalog={catalog}
        query={query}
        origin={results?.origin}
      />
      {failure && (
        <p role="alert" className="field-error">
          {failure}
        </p>
      )}
      {results && (
        <>
          <p>
            {results.total}{" "}
            {results.total === 1 ? "professional" : "professionals"} found
          </p>
          {results.missingCoordinates > 0 && (
            <p className="field-help">
              {results.missingCoordinates} matching listings have no saved
              search coordinates. They remain in ordinary searches, but are
              excluded from radius/nearest searches and map markers.
            </p>
          )}
          <ResultsMap points={results.points} returnTo={directoryHref(query)} />
          <div className="professional-grid">
            {results.hits.map((hit) => (
              <ProfessionalCard
                key={hit.professional.id}
                professional={hit.professional}
                catalog={catalog}
                reviewSummary={hit.reviewSummary}
                distanceMiles={hit.distanceMiles}
                returnTo={directoryHref(query)}
              />
            ))}
          </div>
          {!results.total && (
            <p className="workspace-empty">
              No published professionals match this search. Try another
              category, state or distance.
            </p>
          )}
          <nav aria-label="Results pages">
            {results.page > 1 && (
              <Link href={directoryHref({ ...query, page: results.page - 1 })}>
                Previous page
              </Link>
            )}{" "}
            {results.page < results.pages && (
              <Link href={directoryHref({ ...query, page: results.page + 1 })}>
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
