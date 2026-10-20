import { MapPin, ExternalLink } from "lucide-react";
export function LocationPreview({
  city,
  state,
}: {
  city: string;
  state: string;
}) {
  const location = [city, state].filter(Boolean).join(", ");
  if (!location) return <p>Business location not provided.</p>;
  const href = `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: location })}`;
  return (
    <aside
      className="business-location-preview"
      aria-label="Business location preview"
    >
      <MapPin size={28} aria-hidden="true" />
      <div>
        <strong>{location}</strong>
        <p>
          City-level location. An exact address has not been provided for this
          fictional business.
        </p>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer">
        View city on Google Maps <ExternalLink size={14} aria-hidden="true" />
        <span className="sr-only"> (opens a new tab)</span>
      </a>
    </aside>
  );
}
