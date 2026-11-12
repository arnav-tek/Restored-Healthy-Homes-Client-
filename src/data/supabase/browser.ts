"use client";
import { createBrowserClient } from "@supabase/ssr";
import { stagingConfiguration } from "@/domain/config";
import type { AuthDatabase } from "./database.types";

/** Call only from future connected Auth UI; never from the demo account picker. */
export function createBrowserSupabaseClient() {
  const { url, key } = stagingConfiguration({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return createBrowserClient<AuthDatabase>(url, key);
}
