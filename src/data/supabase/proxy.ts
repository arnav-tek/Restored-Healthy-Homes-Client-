import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createRequestSupabaseClient } from "./server";
import { preventSharedCaching } from "./cache";

export async function refreshStagingSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const client = createRequestSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll(cookies, headers) {
      cookies.forEach(({ name, value }) => request.cookies.set(name, value));
      const previousCookies = response.cookies.getAll();
      response = NextResponse.next({ request });
      previousCookies.forEach((cookie) => response.cookies.set(cookie));
      cookies.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
      Object.entries(headers).forEach(([name, value]) =>
        response.headers.set(name, value),
      );
    },
  });
  // Refresh and verify; downstream authorization still validates identity itself.
  const { error } = await client.auth.getClaims();
  if (error && (!("status" in error) || !error.status || error.status >= 500)) {
    throw new Error("Authentication service unavailable.");
  }
  preventSharedCaching(response.headers);
  return response;
}
