import type { Category } from "../domain/categories";
import { directoryHref } from "../domain/directory-search";
import { parseSearchQuery, type RawSearchParams } from "./directory";

export function safeDirectoryReturn(
  value: string | string[] | undefined,
  catalog: readonly Category[],
): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !/^\/directory(?:\?|$)/.test(value) ||
    /[\\#]/.test(value) ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return "/directory";
  const params = new URLSearchParams(value.split("?").slice(1).join("?"));
  const raw: RawSearchParams = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    // Define properties safely even for unknown keys such as __proto__.
    Object.defineProperty(raw, key, {
      value: values.length === 1 ? values[0] : values,
      enumerable: true,
    });
  }
  const { query, errors } = parseSearchQuery(raw, catalog);
  return Object.keys(errors).length ? "/directory" : directoryHref(query);
}

export function profileHref(id: string, returnTo = "/directory"): string {
  const path = `/professionals/${encodeURIComponent(id)}`;
  return returnTo === "/directory"
    ? path
    : `${path}?${new URLSearchParams({ returnTo })}`;
}
