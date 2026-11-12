import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { stagingConfiguration } from "../../domain/config";
import { isRecord } from "../../validation/member-account";
import type { PublicProfile } from "../../domain/professional";
import type { MemberWorkspace } from "../../domain/member-account";
import type { DirectoryRepository } from "../contracts";
import { searchPublicDirectory } from "../../domain/directory-search";
import type { AuthDatabase } from "./database.types";
export interface PublicDirectorySnapshot {
  catalog: MemberWorkspace["catalog"];
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
  return {
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
        typeof p.featured !== "boolean"
      )
        return invalid();
      return {
        id: String(p.id),
        businessName: String(p.businessName),
        publicDisplayName: String(p.publicDisplayName),
        city: String(p.city),
        state: String(p.state),
        specialty: String(p.specialty),
        summary: String(p.summary),
        serviceArea: String(p.serviceArea),
        freeConsultation: p.freeConsultation,
        featured: p.featured,
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
}
// Anonymous publishable client only. Request memoization, never shared cache; no cookies.
export const loadPublicDirectory = cache(async () => {
  const { url, key } = stagingConfiguration(process.env);
  const client = createClient<AuthDatabase>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  const { data, error } = await client.rpc("rhh_public_directory");
  if (error) throw new Error("Public directory is temporarily unavailable.");
  return projectPublicDirectory(data);
});
export const connectedDirectory: DirectoryRepository = {
  async getCategories() {
    return (await loadPublicDirectory()).catalog.map((c) => ({
      ...c,
      description: "",
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
    return (await loadPublicDirectory()).profiles.filter((p) => p.featured);
  },
  async search(query) {
    if (
      query.location ||
      query.radius !== undefined ||
      query.sort === "nearest"
    )
      return {
        ok: false,
        errors: {
          location:
            "Distance search is not connected yet. Search by state or specialty.",
        },
      };
    if (query.minRating !== undefined)
      return {
        ok: false,
        errors: { minRating: "Review filtering is not connected yet." },
      };
    return {
      ok: true,
      results: searchPublicDirectory(
        await this.listPublic(),
        await this.getCategories(),
        query,
        [],
      ),
    };
  },
};
