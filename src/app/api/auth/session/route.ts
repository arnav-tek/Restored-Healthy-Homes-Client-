import { NextResponse, type NextRequest } from "next/server";
import { applicationMode } from "@/domain/config";
import { createRequestSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { preventSharedCaching } from "@/data/supabase/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ authenticated: false });
  preventSharedCaching(response.headers);
  if (applicationMode(process.env) !== "staging") {
    return new NextResponse(null, { status: 404, headers: response.headers });
  }
  const client = createRequestSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll(cookies, headers) {
      cookies.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
      Object.entries(headers).forEach(([name, value]) =>
        response.headers.set(name, value),
      );
    },
  });
  function finish(body: unknown, status = 200) {
    const headers = new Headers(response.headers);
    headers.delete("set-cookie");
    const result = NextResponse.json(body, { status, headers });
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    return result;
  }
  try {
    const identity = await authenticatedIdentity(client);
    return finish({ authenticated: !!identity, identity });
  } catch {
    return finish({ error: "Authentication service unavailable." }, 503);
  }
}
