import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { directoryRepository, locationAdapter } from "@/data";
import { parseSearchQuery, type RawSearchParams } from "@/validation/directory";
import { directoryHref, type SearchResponse } from "@/domain/directory-search";
import { DirectoryContent } from "@/features/directory/directory-content";
import { isSessionCategoryId } from "@/domain/public-application";
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
  // Syntax recognition selects a view only; the client validates the actual
  // category against this tab's catalog before rendering any search results.
  if (validationErrors.category && isSessionCategoryId(params.category)) {
    delete validationErrors.category;
    query.category = params.category;
  }
  let response: SearchResponse | undefined;
  let unavailable = false;
  if (Object.keys(validationErrors).length === 0) {
    try {
      response = await directoryRepository.search(query);
    } catch {
      unavailable = true;
    }
  }
  const results = response?.ok ? response.results : undefined;
  // Canonicalize only successful searches. Invalid input keeps visible correction guidance.
  if (results) {
    const canonical = directoryHref({
      ...query,
      // Preserve pages that may contain a tab-only application. The existing
      // hydrated results clamp after merging public records.
      page: query.page,
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
  return (
    <div className="container directory-page">
      <header className="page-heading directory-hero" data-scroll-reveal>
        <p className="directory-eyebrow section-tag">
          {" "}
          THE PROFESSIONAL DIRECTORY
        </p>
        <h1 className="directory-title">A healthier home. The right help.</h1>
        <p className="directory-subtitle">
          Explore professionals by specialty, service and location.
        </p>
      </header>
      <DirectoryContent
        catalog={catalog}
        locations={locations}
        params={params}
        response={response}
        unavailable={unavailable}
      />
    </div>
  );
}
