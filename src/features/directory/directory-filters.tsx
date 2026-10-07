import type { Category } from "@/domain/categories";
import type { DemoLocation } from "@/domain/location";
import type { SearchQuery, SearchErrors } from "@/domain/directory-search";
import {
  CategoryField,
  LocationField,
  SupportedLocations,
} from "./search-fields";
import { SlidersHorizontal, Search, ArrowRight } from "lucide-react";
import { SearchForm } from "./search-form";
import Link from "next/link";
import { usStates } from "@/domain/us-states";
import { minimumRatings } from "@/domain/directory-search";

export function DirectoryFilters({
  catalog,
  locations,
  query,
  errors,
}: {
  catalog: readonly Category[];
  locations: readonly DemoLocation[];
  query: SearchQuery;
  errors: SearchErrors;
}) {
  return (
    <aside className="directory-sidebar">
      <div className="filter-card">
        <div className="filter-card-header">
          <SlidersHorizontal
            size={18}
            className="filter-icon"
            aria-hidden="true"
          />
          <div>
            <h2 className="search-filter-heading">Refine your search</h2>
            <p className="filter-subtitle">
              Find the right professionals for your needs.
            </p>
          </div>
        </div>
        <SearchForm className="directory-filters" label="Directory filters">
          <div className="search-field">
            <label htmlFor="q">Keyword</label>
            <div className="input-with-icon">
              <Search size={15} className="input-icon" aria-hidden="true" />
              <input
                type="search"
                id="q"
                name="q"
                maxLength={100}
                defaultValue={query.q}
                placeholder="Business or service..."
                aria-invalid={!!errors.q}
                aria-describedby={errors.q ? "q-error" : undefined}
              />
            </div>
            {errors.q ? (
              <p id="q-error" className="field-error">
                {errors.q}
              </p>
            ) : null}
          </div>
          <CategoryField
            catalog={catalog}
            selected={query.category}
            error={errors.category}
          />
          <LocationField
            value={query.location}
            locations={locations}
            error={errors.location}
          />
          <div className="search-field">
            <label htmlFor="state">State</label>
            <select
              id="state"
              name="state"
              defaultValue={query.state}
              aria-invalid={!!errors.state}
              aria-describedby={
                errors.state ? "state-help state-error" : "state-help"
              }
            >
              <option value="">All states</option>
              {usStates.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <p id="state-help" className="field-help">
              Matches the business location, not its service area.
            </p>
            {errors.state && (
              <p id="state-error" className="field-error">
                {errors.state}
              </p>
            )}
          </div>
          <div className="search-field">
            <label htmlFor="minRating">Minimum review rating</label>
            <select
              id="minRating"
              name="minRating"
              defaultValue={query.minRating ?? ""}
              aria-invalid={!!errors.minRating}
              aria-describedby={
                errors.minRating
                  ? "minRating-help minRating-error"
                  : "minRating-help"
              }
            >
              <option value="">Any rating</option>
              {minimumRatings.map((rating) => (
                <option key={rating} value={rating}>
                  {rating} out of 5 &amp; up
                </option>
              ))}
            </select>
            <p id="minRating-help" className="field-help">
              Uses the displayed average of published reviews. Unrated
              businesses appear with “Any rating.”
            </p>
            {errors.minRating && (
              <p id="minRating-error" className="field-error">
                {errors.minRating}
              </p>
            )}
          </div>
          <div className="search-field">
            <label htmlFor="radius">Radius in miles (optional)</label>
            <input
              id="radius"
              name="radius"
              type="number"
              min={1}
              max={500}
              step={1}
              defaultValue={query.radius ?? ""}
              placeholder="e.g. 50"
              aria-invalid={!!errors.radius}
              aria-describedby={
                errors.radius ? "radius-error radius-help" : "radius-help"
              }
            />
            <p id="radius-help" className="field-help">
              Blank searches the selected city only. A radius includes nearby
              cities (1–500 miles).
            </p>
            {errors.radius ? (
              <p id="radius-error" className="field-error">
                {errors.radius}
              </p>
            ) : null}
          </div>
          <div className="search-field">
            <label htmlFor="sort">Sort results</label>
            <select
              id="sort"
              name="sort"
              defaultValue={query.sort}
              aria-invalid={!!errors.sort}
              aria-describedby="sort-help"
            >
              <option value="az">Business name: A–Z</option>
              <option value="za">Business name: Z–A</option>
              <option value="nearest">Nearest first</option>
            </select>
            <p
              id="sort-help"
              className={errors.sort ? "field-error" : "field-help"}
            >
              {errors.sort ?? "Nearest first requires a supported city or ZIP."}
            </p>
          </div>
          <div className="filter-actions">
            <button type="submit" className="button apply-filters-button">
              Apply filters
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <Link href="/directory" className="clear-filters-link">
              Clear filters
            </Link>
          </div>
        </SearchForm>
        <hr className="filter-divider" />
        <SupportedLocations locations={locations} variant="sidebar" />
      </div>
    </aside>
  );
}
