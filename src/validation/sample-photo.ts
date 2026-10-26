export const samplePhotoLimit = 3 * 1024 * 1024;
export interface SessionPhoto {
  dataUrl: string;
  width: number;
  height: number;
}
export function validSessionPhoto(photo: SessionPhoto): boolean {
  if (!photo || !Number.isInteger(photo.width) || !Number.isInteger(photo.height) ||
    photo.width <= 0 || photo.height <= 0 || photo.width > 4096 || photo.height > 4096 ||
    typeof photo.dataUrl !== "string" || photo.dataUrl.length > samplePhotoLimit * 4 / 3 + 40) return false;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo.dataUrl);
  if (!match) return false;
  try {
    const bytes = atob(match[2]);
    return validSamplePhoto(match[1], bytes.length, Uint8Array.from(bytes.slice(0, 12), (char) => char.charCodeAt(0)));
  } catch { return false; }
}
export function validSamplePhoto(
  type: string,
  size: number,
  header: Uint8Array,
): boolean {
  if (size <= 0 || size > samplePhotoLimit) return false;
  const signature = (...bytes: number[]) =>
    bytes.every((byte, index) => header[index] === byte);
  if (type === "image/jpeg") return signature(255, 216, 255);
  if (type === "image/png") return signature(137, 80, 78, 71, 13, 10, 26, 10);
  return (
    type === "image/webp" &&
    signature(82, 73, 70, 70) &&
    [87, 69, 66, 80].every((byte, index) => header[index + 8] === byte)
  );
}
