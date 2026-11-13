import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { preventSharedCaching } from "../supabase/cache";
import { ProfileMediaError } from "../supabase/profile-media";
export async function readLimited(request: NextRequest, max: number) {
  if (Number(request.headers.get("content-length")) > max)
    throw new ProfileMediaError(413, "File or request exceeds the size limit.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const deadline = Date.now() + 30_000;
  while (true) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new ProfileMediaError(
                  408,
                  "Image request timed out. Your saved image is unchanged.",
                ),
              ),
            Math.max(1, deadline - Date.now()),
          );
        }),
      ]);
    } catch (error) {
      void reader.cancel().catch(() => {});
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
    const { done, value } = chunk;
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new ProfileMediaError(
        413,
        "File or request exceeds the size limit.",
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export function privateHeaders() {
  const headers = new Headers();
  preventSharedCaching(headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return headers;
}
export function imageResponse(blob: Blob, headers: Headers) {
  headers.set("Content-Type", "image/webp");
  headers.set("Content-Disposition", "inline");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  return new NextResponse(blob, { headers });
}
