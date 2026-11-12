import Link from "next/link";
import { connectedDirectory } from "@/data/supabase/public-directory";
import { ProfessionalCard } from "./professional-card";
import { parseSearchQuery, type RawSearchParams } from "@/validation/directory";
import { directoryHref } from "@/domain/directory-search";
export async function ConnectedDirectory({
  params,
}: {
  params: RawSearchParams;
}) {
  let catalog, response, query;
  try {
    catalog = await connectedDirectory.getCategories();
    const parsed = parseSearchQuery(params, catalog);
    query = parsed.query;
    response = Object.keys(parsed.errors).length
      ? { ok: false as const, errors: parsed.errors }
      : await connectedDirectory.search(query);
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
  return (
    <div className="container directory-page">
      <header className="page-heading directory-hero">
        <p className="section-tag">Restored Healthy Homes</p>
        <h1>Find professionals</h1>
        <p>Explore approved professionals with active membership.</p>
      </header>
      <form
        action="/directory"
        method="get"
        className="panel member-form-fields"
      >
        <div className="search-field">
          <label htmlFor="directory-q">Business, service or specialty</label>
          <input
            id="directory-q"
            name="q"
            defaultValue={query.q}
            maxLength={100}
          />
        </div>
        <div className="search-field">
          <label htmlFor="directory-category">Category</label>
          <select
            id="directory-category"
            name="category"
            defaultValue={query.category}
          >
            <option value="">All categories</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="search-field">
          <label htmlFor="directory-state">State abbreviation</label>
          <input
            id="directory-state"
            name="state"
            defaultValue={query.state}
            maxLength={2}
          />
        </div>
        <button type="submit" className="button button-primary">
          Search professionals
        </button>
        <Link href="/directory">Clear filters</Link>
      </form>
      {!response.ok ? (
        <p role="alert" className="field-error">
          {Object.values(response.errors).join(" ")}
        </p>
      ) : (
        <>
          <p>
            {response.results.total}{" "}
            {response.results.total === 1 ? "professional" : "professionals"}{" "}
            found
          </p>
          <div className="professional-grid">
            {response.results.hits.map((hit) => (
              <ProfessionalCard
                key={hit.professional.id}
                professional={hit.professional}
                catalog={catalog}
              />
            ))}
          </div>
          {!response.results.total && (
            <p className="workspace-empty">
              No published professionals match this search. Try another category
              or state. Approved applications remain unpublished until
              membership is active.
            </p>
          )}
          <nav aria-label="Results pages">
            {response.results.page > 1 && (
              <Link
                href={directoryHref({
                  ...query,
                  page: response.results.page - 1,
                })}
              >
                Previous page
              </Link>
            )}{" "}
            {response.results.page < response.results.pages && (
              <Link
                href={directoryHref({
                  ...query,
                  page: response.results.page + 1,
                })}
              >
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
