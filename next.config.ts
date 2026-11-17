import type { NextConfig } from "next";
import { applicationMode } from "./src/domain/config";
applicationMode(process.env);
const config: NextConfig = {
  outputFileTracingIncludes: {
    "/api/map-worker": [
      "./node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
    ],
  },
  logging: { incomingRequests: false },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; worker-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://xjecnuebalmmblowmtks.supabase.co https://tiles.openfreemap.org",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};
export default config;
