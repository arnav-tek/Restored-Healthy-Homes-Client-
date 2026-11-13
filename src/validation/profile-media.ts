import { mediaUuid, type ProfileMediaState } from "../domain/profile-media";
import { isRecord } from "./member-account";
export function parseMediaState(value: unknown): ProfileMediaState | null {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    (value.photoId !== null &&
      (typeof value.photoId !== "string" || !mediaUuid.test(value.photoId))) ||
    typeof value.published !== "boolean" ||
    !Array.isArray(value.drafts) ||
    !value.drafts.every(
      (id): id is string => typeof id === "string" && mediaUuid.test(id),
    )
  )
    return null;
  return {
    version: Number(value.version),
    photoId: value.photoId as string | null,
    published: value.published,
    drafts: [...value.drafts],
  };
}
export function parseMediaRoute(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !mediaUuid.test(value.id) ||
    typeof value.objectPath !== "string"
  )
    return null;
  const parts = value.objectPath.split("/");
  if (
    parts.length !== 2 ||
    !mediaUuid.test(parts[0]) ||
    parts[1] !== `${value.id}.webp`
  )
    return null;
  return { id: value.id, objectPath: value.objectPath };
}
export function parseMediaSave(value: unknown) {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 3 ||
    !Object.keys(value).every((k) =>
      ["target", "version", "published"].includes(k),
    ) ||
    (value.target !== null &&
      (typeof value.target !== "string" || !mediaUuid.test(value.target))) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    typeof value.published !== "boolean"
  )
    return null;
  return {
    target: value.target as string | null,
    version: Number(value.version),
    published: value.target === null ? false : value.published,
  };
}
