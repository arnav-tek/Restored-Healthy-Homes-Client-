import type { NextRequest } from "next/server";
import { handleCredentials } from "@/data/media/credential-handler";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  return handleCredentials(request, false);
}
export async function POST(request: NextRequest) {
  return handleCredentials(request, false);
}
export async function PATCH(request: NextRequest) {
  return handleCredentials(request, false);
}
export async function DELETE(request: NextRequest) {
  return handleCredentials(request, false);
}
