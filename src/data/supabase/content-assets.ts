import "server-only";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { ContentFields } from "@/domain/site-content";
// No fetching admin-provided URLs. Publication uses installed, approved local assets.
export async function aboutAssetsAvailable(fields: ContentFields) {
  if (!fields.videoSrc) return true;
  for (const [key, extensions] of [
    ["videoSrc", "mp4|webm"],
    ["posterSrc", "jpg|jpeg|png|webp"],
    ["captionsSrc", "vtt"],
  ]) {
    const path = fields[key];
    if (!path) {
      if (key === "posterSrc") continue;
      return false;
    }
    if (
      !new RegExp(`^/media/client/[a-zA-Z0-9_-]+\\.(${extensions})$`).test(path)
    )
      return false;
    try {
      if (!(await stat(join(process.cwd(), "public", path))).isFile())
        return false;
    } catch {
      return false;
    }
  }
  return true;
}
