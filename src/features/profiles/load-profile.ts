import "server-only";
import { cache } from "react";
import { directoryRepository } from "@/data";

// Request-scoped sharing keeps the page and its metadata on the same eligibility result.
export const loadProfile = cache(async (id: string) => {
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return null;
  return directoryRepository.getPublicProfile(id);
});
