import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthDatabase } from "./database.types";
import { loadMemberWorkspace, MemberDataError } from "./member-account";
import { authenticatedIdentity } from "./auth";
import { loadAdminWorkspace } from "./admin-account";

/** Account landing only. A denied member read grants no admin authority. */
export async function loadAccountWorkspace(
  client: SupabaseClient<AuthDatabase>,
) {
  try {
    return {
      kind: "member" as const,
      workspace: await loadMemberWorkspace(client),
    };
  } catch (error) {
    if (!(error instanceof MemberDataError) || error.kind !== "denied")
      throw error;
    // The existing RPC independently checks the current protected database role.
    try {
      await loadAdminWorkspace(client);
    } catch (adminError) {
      // Preserve the member failure; an admin probe must not mislabel members.
      if (adminError instanceof MemberDataError && adminError.kind === "denied")
        throw error;
      throw adminError;
    }
    return { kind: "admin" as const };
  }
}

/** Navigation hints only. Protected pages and mutations always authorize independently. */
export async function loadAccountNavigation(
  client: SupabaseClient<AuthDatabase>,
) {
  try {
    if (!(await authenticatedIdentity(client))) return "anonymous" as const;
    try {
      await loadAdminWorkspace(client);
      return "admin" as const;
    } catch (error) {
      if (error instanceof MemberDataError && error.kind === "denied")
        return "member" as const;
      throw error;
    }
  } catch {
    return "unavailable" as const;
  }
}
