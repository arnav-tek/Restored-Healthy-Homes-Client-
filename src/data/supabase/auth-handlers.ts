import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { applicationMode } from "../../domain/config";
import {
  validateAuth,
  safeAuthReturn,
  type AuthAction,
} from "../../validation/auth";
import { createRequestSupabaseClient } from "./server";
import { authenticatedIdentity } from "./auth";
import { preventSharedCaching } from "./cache";
import {
  authConfiguration,
  recoveryCookie,
  recoveryGrant,
  validRecoveryGrant,
} from "./auth-config";

function context(request: NextRequest) {
  const carrier = new NextResponse();
  preventSharedCaching(carrier.headers);
  carrier.headers.set("Referrer-Policy", "no-referrer");
  const client = createRequestSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll(cookies, headers) {
      cookies.forEach(({ name, value, options }) =>
        carrier.cookies.set(name, value, options),
      );
      Object.entries(headers).forEach(([key, value]) =>
        carrier.headers.set(key, value),
      );
    },
  });
  function json(body: unknown, status = 200) {
    const headers = new Headers(carrier.headers);
    headers.delete("set-cookie");
    const response = NextResponse.json(body, { status, headers });
    carrier.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }
  function redirect(path: string) {
    const headers = new Headers(carrier.headers);
    headers.delete("set-cookie");
    const response = new NextResponse(null, {
      status: 303,
      headers,
    });
    carrier.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    response.headers.set(
      "Location",
      new URL(path, authConfiguration().origin).href,
    );
    return response;
  }
  return { client, carrier, json, redirect };
}

export async function handleAuthPost(request: NextRequest, action: string) {
  if (applicationMode(process.env) !== "staging")
    return new NextResponse(null, { status: 404 });
  const { origin } = authConfiguration();
  const ctx = context(request);
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return ctx.json({ error: "This request is not allowed." }, 403);
  if (!["login", "signup", "forgot", "reset", "logout"].includes(action))
    return ctx.json({ error: "Unknown operation." }, 404);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return ctx.json({ error: "Use a JSON request." }, 415);
  // Bounded streamed body, including when Content-Length is missing or forged.
  const reader = request.body?.getReader();
  let raw = "",
    size = 0;
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 4096) {
        await reader.cancel();
        return ctx.json({ error: "Request is too large." }, 413);
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
  }
  let fields: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    fields = parsed as Record<string, unknown>;
  } catch {
    return ctx.json({ error: "Check your form and try again." }, 400);
  }
  const errors = validateAuth(action as AuthAction, fields);
  if (Object.keys(errors).length) return ctx.json({ errors }, 400);
  const email =
    typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
  const password = typeof fields.password === "string" ? fields.password : "";
  try {
    if (action === "forgot") {
      await ctx.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/recovery`,
      });
      // Same response for unknown accounts, delivery failures and provider limits.
      return ctx.json({
        message:
          "If an account matches and delivery is available, you’ll receive a password reset email. Check your inbox and wait before trying again.",
      });
    }
    if (action === "signup") {
      const { data, error } = await ctx.client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error)
        return ctx.json(
          {
            error:
              "We couldn’t complete signup. Check your details or try again later.",
          },
          400,
        );
      // Never grant member access just because signup returned a session.
      if (data.session) await ctx.client.auth.signOut({ scope: "local" });
      return ctx.json({ redirect: "/check-email" });
    }
    if (action === "login") {
      const { error } = await ctx.client.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !(await authenticatedIdentity(ctx.client))) {
        await ctx.client.auth.signOut({ scope: "local" });
        return ctx.json(
          {
            error:
              "Unable to sign in. Check your email/password and confirm your email address.",
          },
          401,
        );
      }
      return ctx.json({ redirect: safeAuthReturn(fields.returnTo) });
    }
    if (action === "reset") {
      const identity = await authenticatedIdentity(ctx.client);
      if (
        !identity ||
        !validRecoveryGrant(
          request.cookies.get(recoveryCookie)?.value,
          identity.id,
        )
      )
        return ctx.json(
          {
            error:
              "This recovery session has expired. Request a new reset email.",
          },
          401,
        );
      const { error } = await ctx.client.auth.updateUser({ password });
      if (error)
        return ctx.json(
          {
            error:
              "Password could not be updated. Use a different password or request a new link.",
          },
          400,
        );
      ctx.carrier.cookies.set(recoveryCookie, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
      });
      const { error: logoutError } = await ctx.client.auth.signOut({
        scope: "global",
      });
      if (logoutError)
        return ctx.json(
          {
            error:
              "Password updated, but sign-out could not be completed. Please sign out before continuing.",
          },
          503,
        );
      return ctx.json({ redirect: "/login?notice=password-updated" });
    }
    const { error } = await ctx.client.auth.signOut({ scope: "global" });
    if (error)
      return ctx.json(
        { error: "Sign-out could not be completed. Please try again." },
        503,
      );
    ctx.carrier.cookies.set(recoveryCookie, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });
    return ctx.json({ redirect: "/login?notice=signed-out" });
  } catch {
    return ctx.json(
      { error: "Authentication is temporarily unavailable. Please try again." },
      503,
    );
  }
}

export async function handleAuthCallback(
  request: NextRequest,
  recovery = false,
) {
  if (applicationMode(process.env) !== "staging")
    return new NextResponse(null, { status: 404 });
  const ctx = context(request);
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 2048 || request.nextUrl.searchParams.has("error"))
    return ctx.redirect("/login?notice=link-invalid");
  let recoveryFlow = false;
  const { data: listener } = ctx.client.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recoveryFlow = true;
  });
  try {
    const { error } = await ctx.client.auth.exchangeCodeForSession(code);
    const identity = error ? null : await authenticatedIdentity(ctx.client);
    if (!identity) return ctx.redirect("/login?notice=link-invalid");
    if (recovery) {
      // The recovery endpoint must complete a recovery flow, not a signup callback.
      if (!recoveryFlow) return ctx.redirect("/login?notice=link-invalid");
      ctx.carrier.cookies.set(recoveryCookie, recoveryGrant(identity.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: authConfiguration().origin.startsWith("https:"),
        path: "/",
        maxAge: 600,
      });
      return ctx.redirect("/reset-password");
    }
    return ctx.redirect("/member");
  } catch {
    return ctx.redirect("/login?notice=link-invalid");
  } finally {
    listener.subscription.unsubscribe();
  }
}
