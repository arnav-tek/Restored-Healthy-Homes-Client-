import type { NextRequest } from "next/server";
import { handleAdminQa } from "@/data/supabase/qa-admin-handler";
export async function GET(request: NextRequest) {
  return handleAdminQa(request);
}
export async function POST(request: NextRequest) {
  return handleAdminQa(request);
}
