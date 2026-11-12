import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { applicationMode, stagingConfiguration } from "../../domain/config";
import type { AuthDatabase } from "./database.types";

export function createRequestSupabaseClient(
  cookieMethods: CookieMethodsServer,
) {
  if (applicationMode(process.env) !== "staging") {
    throw new Error("Connected Auth requires RHH_APP_MODE=staging.");
  }
  const { url, key } = stagingConfiguration(process.env);
  return createServerClient<AuthDatabase>(url, key, {
    cookies: cookieMethods,
    cookieOptions: {
      secure: process.env.RHH_AUTH_ORIGIN?.startsWith("https://") === true,
      sameSite: "lax",
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

/** RSC reads only: Proxy owns refresh writes. Mutating routes must supply a
 * writable cookie adapter to createRequestSupabaseClient instead.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createRequestSupabaseClient({ getAll: () => cookieStore.getAll() });
}
