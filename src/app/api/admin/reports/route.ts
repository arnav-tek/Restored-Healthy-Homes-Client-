import type { NextRequest } from "next/server";
import { handleOperations } from "@/data/supabase/operations-handler";
export const GET = (request: NextRequest) => handleOperations(request, true);
