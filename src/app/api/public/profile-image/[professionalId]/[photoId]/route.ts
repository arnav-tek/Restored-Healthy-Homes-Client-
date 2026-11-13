import { handlePublicProfileImage } from "@/data/media/handlers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ professionalId: string; photoId: string }> },
) {
  const p = await params;
  return handlePublicProfileImage(p.professionalId, p.photoId);
}
