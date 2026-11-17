import { NextRequest } from "next/server";
import { handleConsultations } from "@/data/supabase/consultation-handler";
export const GET = (request: NextRequest) =>
  handleConsultations(request, "preference");
export const PATCH = (request: NextRequest) =>
  handleConsultations(request, "preference");
