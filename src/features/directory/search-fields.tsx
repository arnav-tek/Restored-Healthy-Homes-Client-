import type { Category } from "@/domain/categories";
import type { DemoLocation } from "@/domain/location";

export function CategoryField({
  catalog,
  selected,
  error,
}: {
  catalog: readonly Category[];
  selected: string;
  error?: string;
}) {
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
}: {
  locations: readonly DemoLocation[];
}) {
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
