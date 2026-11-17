import { NextRequest } from "next/server";
import { handleConsultations } from "@/data/supabase/consultation-handler";
export const GET = (request: NextRequest) =>
  handleConsultations(request, "admin");
export const POST = GET;
