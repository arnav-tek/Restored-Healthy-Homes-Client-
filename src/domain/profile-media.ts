export interface ProfileMediaState {
  version: number;
  photoId: string | null;
  published: boolean;
  drafts: string[];
}
export const profileImageInputLimit = 5 * 1024 * 1024;
export const profileImageOutputLimit = 1024 * 1024;
export const profileImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const mediaUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function publicProfileImageHref(
  professionalId: string,
  photoId: string,
) {
  return mediaUuid.test(professionalId) && mediaUuid.test(photoId)
    ? `/api/public/profile-image/${professionalId}/${photoId}`
    : null;
}
