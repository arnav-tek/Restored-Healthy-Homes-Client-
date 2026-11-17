import { parsePublicReviews } from "../../validation/connected-reviews";
import type { PublicReview } from "../../domain/review";
import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { stagingConfiguration } from "../../domain/config";
import { mediaUuid } from "../../domain/profile-media";
import { isRecord } from "../../validation/member-account";
import type { PublicProfile } from "../../domain/professional";
import type { MemberWorkspace } from "../../domain/member-account";
import type { DirectoryRepository } from "../contracts";
import type { AuthDatabase } from "./database.types";
export interface PublicDirectorySnapshot {
  catalog: (MemberWorkspace["catalog"][number] & { description?: string })[];
  reviews: PublicReview[];
  profiles: (PublicProfile & { featured: boolean })[];
}
export function projectPublicDirectory(
  value: unknown,
): PublicDirectorySnapshot {
  const invalid = (): never => {
    throw new Error("Public directory is temporarily unavailable.");
  };
  const strings = (value: unknown): string[] =>
    Array.isArray(value) && value.every((x) => typeof x === "string")
      ? [...value]
      : invalid();
  if (
    !isRecord(value) ||
    !Array.isArray(value.catalog) ||
    !Array.isArray(value.profiles)
  )
    return invalid();
  const reviews = parsePublicReviews(value.reviews);
  if (!reviews) return invalid();
  const projected: PublicDirectorySnapshot = {
    reviews,
    catalog: value.catalog.map((c) => {
      if (
        !isRecord(c) ||
        typeof c.id !== "string" ||
        typeof c.name !== "string" ||
        !Number.isSafeInteger(c.monthlyUsd) ||
        typeof c.active !== "boolean"
      )
        return invalid();
      return {
        id: c.id,
        name: c.name,
        monthlyUsd: Number(c.monthlyUsd),
        active: c.active,
        description:
          typeof c.description === "string" && c.description.length <= 300
            ? c.description
            : "",
      };
    }),
    profiles: value.profiles.map((p) => {
      if (
        !isRecord(p) ||
        ![
          p.id,
          p.businessName,
          p.publicDisplayName,
          p.city,
          p.state,
          p.specialty,
          p.summary,
          p.serviceArea,
        ].every((x) => typeof x === "string") ||
        !isRecord(p.contact) ||
        ![p.contact.email, p.contact.phone, p.contact.website].every(
          (x) => typeof x === "string",
        ) ||
        typeof p.freeConsultation !== "boolean" ||
        typeof p.featured !== "boolean" ||
        (p.editorialFeatured !== undefined &&
          typeof p.editorialFeatured !== "boolean")
      )
        return invalid();
      return {
        id: String(p.id),
        businessName: String(p.businessName),
        photoId:
          typeof p.photoId === "string" && mediaUuid.test(p.photoId)
            ? p.photoId
            : null,
        publicDisplayName: String(p.publicDisplayName),
        city: String(p.city),
        state: String(p.state),
        specialty: String(p.specialty),
        summary: String(p.summary),
        serviceArea: String(p.serviceArea),
        freeConsultation: p.freeConsultation,
        featured: p.featured,
        ...(typeof p.editorialFeatured === "boolean"
          ? { editorialFeatured: p.editorialFeatured }
          : {}),
        categoryIds: strings(p.categoryIds),
        services: strings(p.services),
        verifiedCredentials: strings(p.verifiedCredentials),
        listedCredentials: strings(p.listedCredentials),
        contact: {
          email: String(p.contact.email),
          phone: String(p.contact.phone),
          website: String(p.contact.website),
        },
      };
    }),
  };
  projected.reviews = reviews.filter((r) =>
    projected.profiles.some((p) => p.id === r.professionalId),
  );
  return projected;
}
// Anonymous publishable client only. Request memoization, never shared cache; no cookies.
export function createPublicSupabaseClient() {
  const { url, key } = stagingConfiguration(process.env);
  return createClient<AuthDatabase>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
            : AbortSignal.timeout(10_000),
        }),
    },
  });
}
export const loadPublicDirectory = cache(async () => {
  const client = createPublicSupabaseClient();
  const { data, error } = await client.rpc("rhh_public_directory");
  if (error) throw new Error("Public directory is temporarily unavailable.");
  return projectPublicDirectory(data);
});
export const loadPublicCategoryCatalog = cache(async () => {
  const { data, error } = await createPublicSupabaseClient().rpc(
    "rhh_public_categories",
  );
  if (error) throw new Error("Categories are temporarily unavailable.");
  return projectPublicDirectory({ catalog: data, profiles: [], reviews: [] })
    .catalog;
});
export const connectedDirectory: DirectoryRepository = {
  async getCategories() {
    return (await loadPublicCategoryCatalog()).map((c) => ({
      ...c,
      description: c.description ?? "",
      billingKey: "",
    }));
  },
  async listPublicProfiles() {
    return (await loadPublicDirectory()).profiles;
  },
  async listPublic(categoryId) {
    return (await loadPublicDirectory()).profiles.filter(
      (p) => !categoryId || p.categoryIds.includes(categoryId),
    );
  },
  async getPublicProfile(id) {
    return (
      (await loadPublicDirectory()).profiles.find((p) => p.id === id) ?? null
    );
  },
  async listFeaturedPublic() {
    return (await loadPublicDirectory()).profiles.filter(
      (p) => p.featured || p.editorialFeatured === true,
    );
  },
  async search(query) {
    if (query.location && !query.place)
      return {
        ok: false,
        errors: {
          location: "Choose the intended city or ZIP before searching.",
        },
      };
    const { searchConnectedDirectory } = await import("../locations/directory");
    const results = await searchConnectedDirectory(query);
    return {
      ok: true,
      results: {
        hits: results.hits,
        total: results.total,
        page: results.page,
        pages: results.pages,
        missingCoordinates: results.missingCoordinates,
      },
    };
  },
};
