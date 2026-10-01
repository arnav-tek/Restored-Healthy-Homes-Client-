import type { Category } from "@/domain/categories";
import type { DemoLocation } from "@/domain/location";
import type { SearchQuery, SearchErrors } from "@/domain/directory-search";
import { Button } from "@/components/ui/button";
import {
  CategoryField,
  LocationField,
  SupportedLocations,
} from "./search-fields";
import { ListFilter } from "lucide-react";
import { SearchForm } from "./search-form";
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
      <h2 className="search-filter-heading">
        <ListFilter size={18} aria-hidden="true" />
        Refine your search
      </h2>
      <SearchForm
        className="directory-filters"
        label="Directory filters"
      >
        <div className="search-field">
          <label htmlFor="q">Keyword</label>
          <input
            type="search"
            id="q"
            name="q"
            maxLength={100}
            defaultValue={query.q}
            placeholder="Business or service"
            aria-invalid={!!errors.q}
            aria-describedby={errors.q ? "q-error" : undefined}
          />
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
          <Button type="submit">Apply filters</Button>
          <a href="/directory" className="text-link">
            Clear filters
          </a>
        </div>
      </SearchForm>
      <SupportedLocations locations={locations} />
    </aside>
  );
}
