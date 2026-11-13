import type { NextRequest } from "next/server";
import { handleCredentials } from "@/data/media/credential-handler";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  return handleCredentials(request, true);
}
export async function POST(request: NextRequest) {
  return handleCredentials(request, true);
}
