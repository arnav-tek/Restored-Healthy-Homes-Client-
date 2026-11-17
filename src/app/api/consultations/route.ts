import { NextRequest } from "next/server";
import { handleConsultations } from "@/data/supabase/consultation-handler";
export const GET = (request: NextRequest) =>
  handleConsultations(request, "public");
export const POST = GET;
export const PATCH = GET;
