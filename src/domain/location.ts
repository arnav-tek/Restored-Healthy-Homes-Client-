export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface DemoLocation {
  id: string;
  city: string;
  state: string;
  zip: string;
  coordinates: Coordinates;
}
export type LocationResolution =
  | { status: "resolved"; location: DemoLocation }
  | { status: "ambiguous"; candidates: readonly DemoLocation[] }
  | { status: "unsupported" };
export function approximateMiles(
  a: Coordinates,
  b: Coordinates,
): number | undefined {
  if (
    ![a, b].every(
      ({ latitude, longitude }) =>
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180,
    )
  )
    return undefined;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitude = radians(b.latitude - a.latitude);
  const longitude = radians(b.longitude - a.longitude);
  const h =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
