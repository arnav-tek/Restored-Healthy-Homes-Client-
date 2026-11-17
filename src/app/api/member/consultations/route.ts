import { NextRequest } from "next/server";
import { handleConsultations } from "@/data/supabase/consultation-handler";
export const GET = (request: NextRequest) =>
  handleConsultations(request, "member");
export const POST = GET;
