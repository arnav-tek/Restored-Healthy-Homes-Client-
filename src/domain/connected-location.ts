export interface SearchLocation {
  id: string;
  label: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  kind: "city" | "postcode";
}
export const locationAttribution =
  "Powered by Geoapify · © OpenStreetMap contributors";
export const searchRadii = [10, 25, 50, 100] as const;
export function locationQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  // Deliberately city/ZIP only. Street addresses and URL/control characters are not accepted.
  return /^(?:\d{5}|[\p{L} .’'\-]{2,65}(?:,?\s+[A-Za-z]{2})?)$/u.test(text) &&
    text.length <= 80
    ? text
    : null;
}
export function parseSearchLocation(value: unknown): SearchLocation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (
    typeof p.id !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(p.id) ||
    ![p.label, p.city, p.state, p.zip].every((x) => typeof x === "string") ||
    String(p.label).length > 150 ||
    !/^[A-Z]{2}$/.test(String(p.state)) ||
    (p.zip !== "" && !/^\d{5}$/.test(String(p.zip))) ||
    typeof p.latitude !== "number" ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    typeof p.longitude !== "number" ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.longitude) > 180 ||
    (p.kind !== "city" && p.kind !== "postcode")
  )
    return null;
  return {
    id: p.id,
    label: String(p.label),
    city: String(p.city),
    state: String(p.state),
    zip: String(p.zip),
    latitude: p.latitude,
    longitude: p.longitude,
    kind: p.kind,
  };
}
