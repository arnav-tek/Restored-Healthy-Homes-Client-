import { handleInquiryRequest } from "@/data/supabase/inquiry-handlers";
import type { NextRequest } from "next/server";
export const GET = (request: NextRequest) => handleInquiryRequest(request);
export const PATCH = (request: NextRequest) => handleInquiryRequest(request);
