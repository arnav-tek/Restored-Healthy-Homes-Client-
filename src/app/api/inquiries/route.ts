import { handleInquiryRequest } from "@/data/supabase/inquiry-handlers";
import type { NextRequest } from "next/server";
export const POST = (request: NextRequest) => handleInquiryRequest(request, true);
