import "server-only";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import {
  createServerSupabaseClient,
  createRequestSupabaseClient,
} from "./server";

export class AuthenticationRequired extends Error {
  constructor() {
    super("Authentication required.");
  }
}

/** Identity only: no metadata/email-to-account mapping or application role trust.
 * Later data operations still need ownership policies and explicit authorization.
 */
export async function authenticatedIdentity(
  client: ReturnType<typeof createRequestSupabaseClient>,
): Promise<{ id: string } | null> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (
      isAuthSessionMissingError(error) ||
      error.status === 401 ||
      error.status === 403
    )
      return null;
    throw new Error("Authentication service unavailable.");
  }
  if (!data.user || data.user.is_anonymous || !data.user.email_confirmed_at)
    return null;
  return { id: data.user.id };
}

export async function requireAuthenticatedIdentity() {
  const client = await createServerSupabaseClient();
  const identity = await authenticatedIdentity(client);
  if (!identity) throw new AuthenticationRequired();
  return { identity, client };
}
