import { NextResponse, type NextRequest } from "next/server";
import { pendingPublicSections } from "./domain/connected-public-routes";
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
    if (
      request.nextUrl.pathname === "/" ||
      request.nextUrl.pathname === "/consultations" ||
      [
        "/pricing",
        "/education",
        "/about",
        "/resources",
        "/contact",
        "/terms",
        "/privacy",
        "/disclaimer",
      ].includes(request.nextUrl.pathname) ||
      request.nextUrl.pathname.startsWith("/resources/") ||
      request.nextUrl.pathname === "/questions" ||
      request.nextUrl.pathname.startsWith("/questions/") ||
      pendingPublicSections[request.nextUrl.pathname]
    ) {
      sessionResponse = NextResponse.next();
      preventSharedCaching(sessionResponse.headers);
    } else {
      const unavailable = NextResponse.json(
        { error: "Authentication service unavailable." },
        { status: 503 },
      );
      preventSharedCaching(unavailable.headers);
      return unavailable;
    }
  }
  const path = request.nextUrl.pathname;
  if (path === "/demo/member") {
    const redirect = NextResponse.redirect(new URL("/member", request.url));
    sessionResponse.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    preventSharedCaching(redirect.headers);
    return redirect;
  }
  if (
    [
      "/",
      "/availability",
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
      "/questions",
      "/consultations",
      "/pricing",
      "/education",
      "/about",
      "/resources",
      "/contact",
      "/terms",
      "/privacy",
      "/disclaimer",
      "/admin",
    ].includes(path) ||
    path.startsWith("/admin/") ||
    path.startsWith("/professionals/") ||
    path.startsWith("/questions/") ||
    path.startsWith("/resources/") ||
    path === "/api/questions" ||
    path === "/api/consultations" ||
    path === "/api/member/consultations" ||
    path === "/api/member/consultation-preference" ||
    path === "/api/admin/consultations" ||
    path === "/api/locations" ||
    path === "/api/map-worker" ||
    path === "/api/member/location" ||
    path === "/api/member/questions" ||
    path === "/api/admin/applications" ||
    path === "/api/admin/categories" ||
    path === "/api/admin/content" ||
    path === "/api/admin/featured" ||
    path === "/api/admin/reports" ||
    path === "/api/admin/inquiry-notifications" ||
    path === "/api/inquiries" ||
    path === "/api/member/inquiries" ||
    path.startsWith("/member/") ||
    path.startsWith("/api/auth/") ||
    path === "/api/member/application" ||
    path === "/api/member/profile-media" ||
    path === "/api/member/credentials" ||
    path === "/api/admin/credentials" ||
    path === "/api/admin/questions" ||
    path === "/api/admin/reviews" ||
    path === "/api/member/reviews" ||
    path.startsWith("/api/public/reviews/") ||
    path.startsWith("/api/public/profile-image/")
  ) {
    sessionResponse.headers.set("Referrer-Policy", "no-referrer");
    return sessionResponse;
  }
  if (!path.startsWith("/api/") && !path.startsWith("/demo/")) {
    const target = new URL("/availability", request.url);
    target.searchParams.set("section", pendingPublicSections[path] ? path : "");
    const response = NextResponse.rewrite(target, {
      status: pendingPublicSections[path] ? 200 : 404,
      request: { headers: request.headers },
    });
    sessionResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    preventSharedCaching(response.headers);
    return response;
  }
  const response = NextResponse.json(
    { error: "This endpoint is not available." },
    { status: 404 },
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
