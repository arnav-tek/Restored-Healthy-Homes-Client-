import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime = "nodejs";
export async function GET() {
  const bytes = await readFile(
    join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"),
  );
  return new Response(bytes, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
