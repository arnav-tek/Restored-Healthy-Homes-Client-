export const samplePhotoLimit = 3 * 1024 * 1024;
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
