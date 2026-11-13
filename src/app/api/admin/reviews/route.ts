import type { NextRequest } from "next/server";
import { handleReviewRequest } from "@/data/supabase/review-handler";
export async function GET(request: NextRequest) {
  return handleReviewRequest(request, "admin");
}
export async function POST(request: NextRequest) {
  return handleReviewRequest(request, "admin");
}
