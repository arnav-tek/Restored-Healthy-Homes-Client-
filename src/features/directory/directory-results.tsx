"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/domain/categories";
import type { DemoLocation } from "@/domain/location";
import type { PublicProfessional } from "@/domain/professional";
import {
  DIRECTORY_PAGE_SIZE,
  directoryHref,
  searchPublicDirectory,
  type SearchQuery,
} from "@/domain/directory-search";
import { publicSessionReviews } from "@/domain/review-session";
import { eligiblePublicIds } from "@/domain/public-session";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { ProfessionalCard } from "./professional-card";
import { Pagination } from "./pagination";
import { SortBySelect } from "./sort-by-select";
import { EmptyDirectory } from "./directory-state";

// The server sends only eligible public listing DTOs. This small directory uses
// the existing review overlay so filters, counts and pages follow moderation.
export function DirectoryResults({
  professionals,
  catalog,
  locations,
  query,
  origin,
}: {
  professionals: readonly PublicProfessional[];
  catalog: readonly Category[];
  locations: readonly DemoLocation[];
  query: SearchQuery;
  origin?: DemoLocation;
}) {
  const { state } = useDemoSession();
  const router = useRouter();
  const ready = useDemoReady();
  const reviews = professionals.flatMap(({ id }) =>
    publicSessionReviews(state.reviews, eligiblePublicIds(state), id),
  );
  const results = searchPublicDirectory(
    professionals,
    catalog,
    query,
    locations,
    origin,
    reviews,
  );
  // A same-tab moderation decision can change the last available page. Wait
  // until hydration so SSR seed counts cannot overwrite current session URLs.
  useEffect(() => {
    if (ready && query.page !== results.page)
      router.replace(directoryHref({ ...query, page: results.page }), {
        scroll: false,
      });
  }, [ready, query, results.page, router]);
  const title =
    catalog.find((category) => category.id === query.category)?.name ??
    "All specialties";
  return (
    <>
      <div className="results-heading">
        <div className="results-heading-title">
          <h2>{title}</h2>
          <p aria-live="polite">
            {results.total === 0
              ? "0 matching professionals"
              : `Showing ${(results.page - 1) * DIRECTORY_PAGE_SIZE + 1}–${Math.min(results.page * DIRECTORY_PAGE_SIZE, results.total)} of ${results.total} professionals`}
          </p>
        </div>
        {results.total > 0 && <SortBySelect query={query} />}
      </div>
      {results.origin && (
        <p className="search-context">
          {query.radius === undefined
            ? `In ${results.origin.city}, ${results.origin.state}.`
            : `Within ${query.radius} miles of ${results.origin.city}, ${results.origin.state}.`}{" "}
          Distances are approximate, measured between city centers, not travel
          distances or service areas.
          {results.missingCoordinates > 0 &&
            " Some matching listings lack coordinates; distance is unavailable and they are excluded from radius searches."}
        </p>
      )}
      {results.hits.length === 0 ? (
        <EmptyDirectory />
      ) : (
        <div className="professional-grid" data-scroll-stagger>
          {results.hits.map(
            ({ professional, distanceMiles, reviewSummary }) => (
              <ProfessionalCard
                key={professional.id}
                professional={professional}
                catalog={catalog}
                distanceMiles={distanceMiles}
                reviewSummary={reviewSummary}
                returnTo={directoryHref({ ...query, page: results.page })}
              />
            ),
          )}
        </div>
      )}
      <Pagination query={query} page={results.page} pages={results.pages} />
    </>
  );
}
