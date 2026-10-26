"use client";
import type { Category } from "@/domain/categories";
import { useDemoSession } from "@/features/member/demo-session";
import { publicDirectoryCatalog } from "@/domain/public-application";
import type { DemoLocation } from "@/domain/location";
import { MapPin, ChevronUp } from "lucide-react";
import Link from "next/link";

export function CategoryField({
  catalog: initialCatalog,
  selected,
  error,
}: {
  catalog: readonly Category[];
  selected: string;
  error?: string;
}) {
  const { state } = useDemoSession();
  const catalog = publicDirectoryCatalog(initialCatalog, state);
  return (
    <div className="search-field">
      <label htmlFor="category">Professional category</label>
      <select
        id="category"
        name="category"
        defaultValue={selected}
        aria-invalid={!!error}
        aria-describedby={error ? "category-error" : undefined}
      >
        <option value="">All professionals</option>
        {catalog.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {error ? (
        <p className="field-error" id="category-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LocationField({
  value,
  locations,
  error,
}: {
  value: string;
  locations: readonly DemoLocation[];
  error?: string;
}) {
  return (
    <div className="search-field">
      <label htmlFor="location">City or ZIP code</label>
      <div className="input-with-icon">
        <MapPin size={15} className="input-icon" aria-hidden="true" />
        <input
          id="location"
          name="location"
          type="text"
          maxLength={80}
          defaultValue={value}
          placeholder="Try Raleigh, NC or 27601"
          autoComplete="off"
          list="demo-cities"
          aria-invalid={!!error}
          aria-describedby={
            error ? "location-error location-help" : "location-help"
          }
        />
      </div>
      <datalist id="demo-cities">
        {locations.map((location) => (
          <option
            key={location.id}
            value={`${location.city}, ${location.state}`}
          >
            {location.zip}
          </option>
        ))}
      </datalist>
      {error ? (
        <p className="field-error" id="location-error">
          {error}
        </p>
      ) : null}
      <p className="field-help" id="location-help">
        Leave blank to explore all locations.
      </p>
    </div>
  );
}

export function SupportedLocations({
  locations,
  variant = "sidebar",
}: {
  locations: readonly DemoLocation[];
  variant?: "sidebar" | "hero";
}) {
  if (variant === "hero") {
    return (
      <details className="supported-locations">
        <summary>Supported locations</summary>
        <p>
          Only these city names, city/state pairs and ZIP codes are included. ZIP
          codes use the same approximate center as their city.
        </p>
        <ul>
          {locations.map((location) => (
            <li key={location.id}>
              {location.city}, {location.state} <span>{location.zip}</span>
            </li>
          ))}
        </ul>
      </details>
    );
  }

  const popular = [
    { city: "Raleigh", state: "NC" },
    { city: "Asheville", state: "NC" },
    { city: "Portland", state: "OR" },
    { city: "Boulder", state: "CO" },
    { city: "Madison", state: "WI" },
  ];

  return (
    <div className="popular-locations-container">
      <details className="popular-locations" open>
        <summary className="popular-locations-summary">
          <span className="popular-locations-header">
            <MapPin size={16} className="popular-pin-icon" aria-hidden="true" />
            <span>Popular locations</span>
          </span>
          <ChevronUp size={16} className="popular-chevron" aria-hidden="true" />
        </summary>
        <ul className="popular-locations-list">
          {popular.map((loc) => (
            <li key={`${loc.city}-${loc.state}`}>
              <Link
                href={`/directory?location=${encodeURIComponent(`${loc.city}, ${loc.state}`)}`}
                className="popular-location-link"
              >
                <MapPin size={13} className="popular-list-pin" aria-hidden="true" />
                <span>
                  {loc.city}, {loc.state}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <details className="all-locations-toggle">
          <summary className="all-locations-summary">
            View all locations <span aria-hidden="true">→</span>
          </summary>
          <div className="all-locations-content">
            <ul className="all-locations-list">
              {locations.map((location) => (
                <li key={location.id}>
                  <Link
                    href={`/directory?location=${encodeURIComponent(`${location.city}, ${location.state}`)}`}
                  >
                    {location.city}, {location.state}{" "}
                    <span className="zip-pill">{location.zip}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </details>
    </div>
  );
}
