import type { NextRequest } from "next/server";
import { handleAuthPost } from "@/data/supabase/auth-handlers";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return handleAuthPost(request, (await context.params).action);
}
