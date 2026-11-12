import { NextResponse, type NextRequest } from "next/server";
import { applicationMode } from "./domain/config";
import { refreshStagingSession } from "./data/supabase/proxy";
import { preventSharedCaching } from "./data/supabase/cache";

export async function proxy(request: NextRequest) {
  if (applicationMode(process.env) === "demo") return NextResponse.next();
  // Automation has its own server capability, independent of browser sessions.
  if (request.nextUrl.pathname === "/api/internal/inquiry-notifications") {
    const response = NextResponse.next();
    preventSharedCaching(response.headers);
    return response;
  }
  let sessionResponse: NextResponse;
  try {
    sessionResponse = await refreshStagingSession(request);
  } catch {
    const unavailable = NextResponse.json(
      { error: "Authentication service unavailable." },
      { status: 503 },
    );
    preventSharedCaching(unavailable.headers);
    return unavailable;
  }
  const path = request.nextUrl.pathname;
  if (path === "/" || path === "/demo/member") {
    const redirect = NextResponse.redirect(
      new URL(path === "/" ? "/login" : "/member", request.url),
    );
    sessionResponse.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    preventSharedCaching(redirect.headers);
    return redirect;
  }
  if (
    [
      "/login",
      "/signup",
      "/check-email",
      "/forgot-password",
      "/reset-password",
      "/auth/callback",
      "/auth/recovery",
      "/member",
      "/list-your-business",
      "/directory",
      "/admin",
    ].includes(path) ||
    path.startsWith("/admin/") ||
    path.startsWith("/professionals/") ||
    path === "/api/admin/applications" ||
    path === "/api/admin/inquiry-notifications" ||
    path === "/api/inquiries" ||
    path === "/api/member/inquiries" ||
    path.startsWith("/member/") ||
    path.startsWith("/api/auth/") ||
    path === "/api/member/application"
  ) {
    sessionResponse.headers.set("Referrer-Policy", "no-referrer");
    return sessionResponse;
  }
  // Unimplemented connected sections never mount fictional demo roles.
  const response = NextResponse.json(
    {
      message: "This section is not connected yet.",
    },
    {
      status:
        path.startsWith("/admin") || path.startsWith("/demo/admin") ? 403 : 503,
    },
  );
  sessionResponse.cookies
    .getAll()
    .forEach((cookie) => response.cookies.set(cookie));
  preventSharedCaching(response.headers);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|media/|images/|fonts/).*)",
  ],
};
