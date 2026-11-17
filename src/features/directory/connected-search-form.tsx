"use client";
import Link from "next/link";
import type { Category } from "@/domain/categories";
import type { SearchQuery } from "@/domain/directory-search";
import { minimumRatings } from "@/domain/directory-search";
import type { SearchLocation } from "@/domain/connected-location";
import { searchRadii } from "@/domain/connected-location";
import { useLocationChoice, LocationChoice } from "./location-choice";
export function ConnectedSearchForm({
  catalog,
  query,
  origin,
  home = false,
}: {
  catalog: readonly Category[];
  query: SearchQuery;
  origin?: SearchLocation | null;
  home?: boolean;
}) {
  const choice = useLocationChoice(origin, query.location);
  return (
    <form
      action="/directory"
      method="get"
      className={
        home ? "search-form" : "panel member-form-fields connected-search-form"
      }
      aria-label={home ? "Find professionals" : "Filter professionals"}
      onSubmit={(e) => {
        if (choice.text.trim() && !choice.selected) {
          e.preventDefault();
          void choice.resolve();
        }
      }}
    >
      <LocationChoice choice={choice} />
      <div className="search-field">
        <label htmlFor={home ? "home-category" : "directory-category"}>
          Professional category
        </label>
        <select
          id={home ? "home-category" : "directory-category"}
          name="category"
          defaultValue={query.category}
        >
          <option value="">All professionals</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {!home && (
        <div className="search-field">
          <label htmlFor="directory-q">Business, service or specialty</label>
          <input
            id="directory-q"
            name="q"
            defaultValue={query.q}
            maxLength={100}
          />
        </div>
      )}
      <div className="search-field">
        <label htmlFor={home ? "home-state" : "directory-state"}>
          State abbreviation
        </label>
        <input
          id={home ? "home-state" : "directory-state"}
          name="state"
          defaultValue={query.state}
          maxLength={2}
          placeholder="e.g. NC"
        />
      </div>
      {!home && (
        <>
          <div className="search-field">
            <label htmlFor="directory-radius">
              Distance from selected center
            </label>
            <select
              id="directory-radius"
              name="radius"
              defaultValue={query.radius ?? ""}
            >
              <option value="">Any distance</option>
              {searchRadii.map((n) => (
                <option value={n} key={n}>
                  {n} miles
                </option>
              ))}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="directory-min-rating">Minimum rating</label>
            <select
              id="directory-min-rating"
              name="minRating"
              defaultValue={query.minRating ?? ""}
            >
              <option value="">Any rating</option>
              {minimumRatings.map((n) => (
                <option key={n} value={n}>
                  {n} and up
                </option>
              ))}
            </select>
          </div>
          <div className="search-field">
            <label htmlFor="directory-sort">Sort by</label>
            <select id="directory-sort" name="sort" defaultValue={query.sort}>
              <option value="az">Business name: A–Z</option>
              <option value="za">Business name: Z–A</option>
              <option value="rating">Highest rated</option>
              <option value="nearest">Nearest listed location</option>
            </select>
          </div>
        </>
      )}
      <button type="submit" className="button" disabled={choice.busy}>
        {choice.busy
          ? "Finding locations…"
          : home
            ? "Search"
            : "Search professionals"}
      </button>
      {!home && <Link href="/directory">Clear filters</Link>}
    </form>
  );
}
