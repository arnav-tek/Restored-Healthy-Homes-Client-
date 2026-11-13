import "server-only";
import sharp from "sharp";
import {
  profileImageInputLimit,
  profileImageOutputLimit,
  profileImageTypes,
} from "../../domain/profile-media";
/** Full decode/re-encode, autorotation and metadata removal. Never preserve SVG/animation. */
export async function processProfileImage(input: Uint8Array, type: string) {
  if (
    !profileImageTypes.some((t) => t === type) ||
    !input.length ||
    input.length > profileImageInputLimit
  )
    throw new Error("Choose a JPEG, PNG or WebP image up to 5 MB.");
  try {
    const image = sharp(input, {
      limitInputPixels: 16_000_000,
      failOn: "warning",
      animated: true,
    });
    const metadata = await image.metadata();
    const expected = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    }[type];
    if (
      !expected ||
      metadata.format !== expected ||
      (metadata.pages ?? 1) !== 1 ||
      !metadata.width ||
      !metadata.height
    )
      throw new Error("invalid");
    const bytes = await image
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .timeout({ seconds: 15 })
      .toBuffer();
    if (!bytes.length || bytes.length > profileImageOutputLimit)
      throw new Error("large");
    return bytes;
  } catch {
    throw new Error(
      "This image could not be processed. Choose a valid, static JPEG, PNG or WebP image.",
    );
  }
}
