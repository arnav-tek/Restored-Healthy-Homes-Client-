import type { NextRequest } from "next/server";
import { handleReviewRequest } from "@/data/supabase/review-handler";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleReviewRequest(request, "public", (await params).id);
}
