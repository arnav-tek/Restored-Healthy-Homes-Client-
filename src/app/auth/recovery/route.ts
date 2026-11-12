import type { NextRequest } from "next/server";
import { handleAuthCallback } from "@/data/supabase/auth-handlers";
export async function GET(request: NextRequest) {
  return handleAuthCallback(request, true);
}
