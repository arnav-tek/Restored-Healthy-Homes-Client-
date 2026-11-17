import assert from "node:assert/strict";
import { test } from "node:test";
import {
  locationQuery,
  parseSearchLocation,
} from "../../src/domain/connected-location";
import {
  projectGeocodes,
  lookupLocation,
} from "../../src/data/locations/geocoding";
import {
  defaultSearch,
  directoryHref,
} from "../../src/domain/directory-search";
import { safeDirectoryReturn } from "../../src/validation/profile";
import { POST } from "../../src/app/api/locations/route";
import { NextRequest } from "next/server";
import { groupMapMarkers } from "../../src/domain/map-markers";
const id = "00000000-0000-4000-8000-000000000001";
const place = {
  id,
  label: "Holtsville, NY 00501",
  city: "Holtsville",
  state: "NY",
  zip: "00501",
  kind: "postcode",
  latitude: 40.81,
  longitude: -73.04,
};
const source = {
  country_code: "us",
  result_type: "postcode",
  city: "Holtsville",
  state_code: "NY",
  postcode: "00501",
  lat: 40.81,
  lon: -73.04,
  datasource: { sourcename: "openstreetmap" },
  address_line1: "PRIVATE STREET",
  apiKey: "PRIVATE",
};
test("map markers group overlapping hit areas, including nearby distinct centers, and separate on zoom", () => {
  const markers = [
    { location: { longitude: 0, latitude: 0 } },
    { location: { longitude: 0, latitude: 0 } },
    { location: { longitude: 1, latitude: 1 } },
    { location: { longitude: 100, latitude: 100 } },
  ];
  assert.deepEqual(
    groupMapMarkers(markers, ([x, y]) => ({ x, y })).map((g) => g.length),
    [3, 1],
  );
  assert.deepEqual(
    groupMapMarkers(markers, ([x, y]) => ({ x: x * 100, y: y * 100 })).map(
      (g) => g.length,
    ),
    [2, 1, 1],
  );
});
test("city/ZIP validation preserves leading zeros, bounds coordinates and allowlists projected data", () => {
  assert.equal(locationQuery(" 00501 "), "00501");
  assert.equal(locationQuery("Springfield, IL"), "Springfield, IL");
  for (const q of [
    "123 Main Street",
    "https://bad.invalid",
    "0050",
    "x".repeat(81),
    "Boston\n<script>",
  ])
    assert.equal(locationQuery(q), null);
  assert.deepEqual(
    parseSearchLocation({ ...place, ownerId: "PRIVATE", address: "PRIVATE" }),
    place,
  );
  for (const p of [
    { ...place, latitude: 91 },
    { ...place, longitude: -181 },
    { ...place, latitude: NaN },
    { ...place, zip: "501" },
  ])
    assert.equal(parseSearchLocation(p), null);
  const candidates = projectGeocodes(
    {
      results: [
        source,
        { ...source, postcode: "99999" },
        { ...source, country_code: "ca" },
        { ...source, result_type: "building" },
        { ...source, datasource: { sourcename: "unapproved" } },
      ],
    },
    "00501",
  );
  assert.equal(candidates.length, 1);
  assert.doesNotMatch(JSON.stringify(candidates), /PRIVATE|apiKey|address/);
  assert.equal(
    projectGeocodes(
      {
        results: [
          {
            ...source,
            result_type: "city",
            city: "Springfield",
            state_code: "IL",
          },
          {
            ...source,
            result_type: "city",
            city: "Springfield",
            state_code: "MA",
          },
        ],
      },
      "Springfield",
    ).length,
    2,
  );
  assert.equal(
    projectGeocodes(
      {
        results: [
          {
            ...source,
            result_type: "city",
            city: "Springfield",
            state_code: "MA",
          },
        ],
      },
      "Springfield, IL",
    ).length,
    0,
  );
});
test("shareable selection, combined filters and profile return survive validated URL round-trip", () => {
  const href = directoryHref({
    ...defaultSearch,
    location: place.label,
    place: id,
    radius: 25,
    category: "mold-inspection",
    state: "NY",
    q: "healthy",
    minRating: 4,
    sort: "nearest",
    page: 2,
  });
  assert.equal(
    safeDirectoryReturn(href, [
      {
        id: "mold-inspection",
        name: "Mold",
        monthlyUsd: 79,
        billingKey: "",
        description: "",
      },
    ]),
    href,
  );
  assert.equal(
    safeDirectoryReturn("https://bad.invalid/directory", []),
    "/directory",
  );
});
test("provider boundary budgets before lookup, caches without another provider call, retries only within durable allowance", async (t) => {
  const old = { ...process.env };
  t.after(() => {
    process.env = old;
  });
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    GEOAPIFY_API_KEY: "test-provider-not-live",
    RHH_LOCATION_GATEWAY_KEY: "test-gateway-capability-not-live-00000",
  });
  delete process.env.VERCEL_ENV;
  let gateState = "lookup",
    providerCalls = 0,
    mode = "ok",
    gateCalls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        typeof input === "string" || input instanceof URL
          ? String(input)
          : input.url,
      );
      if (url.hostname.endsWith("supabase.co")) {
        gateCalls++;
        const p = JSON.parse(String(init?.body));
        assert.equal(p.gateway, process.env.RHH_LOCATION_GATEWAY_KEY);
        if (p.operation === "complete") {
          assert.equal(p.payload.places.length, 1);
          assert.equal(p.payload.places[0].zip, "00501");
          return Response.json({ state: "cached", places: [place] });
        }
        return Response.json({
          state: gateState,
          lease: id,
          ...(gateState === "cached" ? { places: [place] } : {}),
        });
      }
      assert.equal(url.origin, "https://api.geoapify.com");
      assert.equal(url.pathname, "/v1/geocode/search");
      assert.equal(url.searchParams.get("filter"), "countrycode:us");
      assert.equal(url.searchParams.get("text"), "00501");
      assert.equal(init?.redirect, "error");
      providerCalls++;
      if (mode === "timeout")
        throw new DOMException("test timeout", "TimeoutError");
      if (mode === "rate") return new Response("PRIVATE", { status: 429 });
      if (mode === "bad") return new Response("PRIVATE", { status: 401 });
      return Response.json({ results: [source] });
    },
  );
  assert.deepEqual(await lookupLocation("00501", "test-bucket"), [place]);
  assert.equal(providerCalls, 1);
  gateState = "cached";
  assert.deepEqual(await lookupLocation("00501", "test-bucket"), [place]);
  assert.equal(providerCalls, 1);
  gateState = "budget";
  await assert.rejects(
    () => lookupLocation("00501", "test-bucket"),
    /allowance/,
  );
  assert.equal(providerCalls, 1);
  gateState = "limited";
  await assert.rejects(() => lookupLocation("00501", "test-bucket"), /busy/);
  assert.equal(providerCalls, 1);
  gateState = "lookup";
  mode = "timeout";
  await assert.rejects(
    () => lookupLocation("00501", "test-bucket"),
    /timed out/,
  );
  assert.equal(providerCalls, 3);
  mode = "rate";
  await assert.rejects(() => lookupLocation("00501", "test-bucket"), /busy/);
  assert.equal(providerCalls, 4);
  mode = "bad";
  await assert.rejects(
    () => lookupLocation("00501", "test-bucket"),
    /unavailable/,
  );
  assert.equal(providerCalls, 5);
  const before = gateCalls;
  delete process.env.GEOAPIFY_API_KEY;
  await assert.rejects(
    () => lookupLocation("00501", "test-bucket"),
    /not available yet/,
  );
  assert.equal(gateCalls, before);
});
test("public geocoding endpoint rejects foreign origins/fields and has honest missing-key private response", async (t) => {
  const old = { ...process.env };
  t.after(() => {
    process.env = old;
  });
  Object.assign(process.env, {
    RHH_APP_MODE: "staging",
    NEXT_PUBLIC_SUPABASE_URL: "https://xjecnuebalmmblowmtks.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    RHH_AUTH_ORIGIN: "http://127.0.0.1:3230",
    RHH_AUTH_COOKIE_SECRET: "local-test-cookie-secret-00000000000",
  });
  delete process.env.VERCEL_ENV;
  delete process.env.GEOAPIFY_API_KEY;
  const req = (body: unknown, origin = "http://127.0.0.1:3230") =>
    new NextRequest("http://127.0.0.1:3230/api/locations", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await POST(req({ query: "00501" }, "https://bad.invalid"))).status,
    403,
  );
  assert.equal(
    (await POST(req({ query: "00501", url: "https://bad.invalid" }))).status,
    400,
  );
  const unavailable = await POST(req({ query: "00501" }));
  assert.equal(unavailable.status, 503);
  assert.match(unavailable.headers.get("cache-control")!, /private.*no-store/);
  assert.doesNotMatch(await unavailable.text(), /sb_secret_|apiKey|gateway/);
});
