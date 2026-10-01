import "server-only";
import type { DemoLocation } from "../../domain/location";
import type { LocationAdapter } from "../contracts";
// Rounded illustrative city centers, not surveyed business/ZIP coordinates.
export const demoLocations: readonly DemoLocation[] = [
  {
    id: "asheville-nc",
    city: "Asheville",
    state: "NC",
    zip: "28801",
    coordinates: { latitude: 35.6, longitude: -82.55 },
  },
  {
    id: "austin-tx",
    city: "Austin",
    state: "TX",
    zip: "78701",
    coordinates: { latitude: 30.27, longitude: -97.74 },
  },
  {
    id: "portland-or",
    city: "Portland",
    state: "OR",
    zip: "97201",
    coordinates: { latitude: 45.52, longitude: -122.68 },
  },
  {
    id: "boulder-co",
    city: "Boulder",
    state: "CO",
    zip: "80301",
    coordinates: { latitude: 40.02, longitude: -105.27 },
  },
  {
    id: "raleigh-nc",
    city: "Raleigh",
    state: "NC",
    zip: "27601",
    coordinates: { latitude: 35.78, longitude: -78.64 },
  },
  {
    id: "madison-wi",
    city: "Madison",
    state: "WI",
    zip: "53703",
    coordinates: { latitude: 43.07, longitude: -89.4 },
  },
  {
    id: "richmond-va",
    city: "Richmond",
    state: "VA",
    zip: "23219",
    coordinates: { latitude: 37.54, longitude: -77.44 },
  },
  {
    id: "tampa-fl",
    city: "Tampa",
    state: "FL",
    zip: "33602",
    coordinates: { latitude: 27.95, longitude: -82.46 },
  },
  {
    id: "portland-me",
    city: "Portland",
    state: "ME",
    zip: "04101",
    coordinates: { latitude: 43.66, longitude: -70.26 },
  },
  {
    id: "round-rock-tx",
    city: "Round Rock",
    state: "TX",
    zip: "78664",
    coordinates: { latitude: 30.51, longitude: -97.68 },
  },
];
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
export const demoLocationAdapter: LocationAdapter = {
  async listSupported() {
    return demoLocations;
  },
  async resolve(input) {
    const value = normalize(input);
    const matches = demoLocations.filter((place) =>
      [
        place.zip,
        normalize(place.city),
        normalize(`${place.city} ${place.state}`),
      ].includes(value),
    );
    if (matches.length === 1)
      return { status: "resolved", location: matches[0] };
    if (matches.length > 1) return { status: "ambiguous", candidates: matches };
    return { status: "unsupported" };
  },
};
