import { handleQaRequest } from "@/data/supabase/qa-handler";
import type { NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  return handleQaRequest(request, false);
}
export async function POST(request: NextRequest) {
  return handleQaRequest(request, false);
}
