"use client";
import Link from "next/link";
import type { Category } from "@/domain/categories";
import {
  PUBLIC_APPLICATION_ID,
  publicDirectoryCatalog,
} from "@/domain/public-application";
import { publicSessionProfiles } from "@/domain/public-session";
import { safeDirectoryReturn } from "@/validation/profile";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { ProfileView } from "./profile-view";

export function SessionProfile({
  id,
  catalog,
  returnTo,
  reviewPage,
}: {
  id: string;
  catalog: readonly Category[];
  returnTo?: string | string[];
  reviewPage?: unknown;
}) {
  const { state } = useDemoSession();
  const ready = useDemoReady();
  const profile = publicSessionProfiles(state).find((item) => item.id === id);
  const currentCatalog = publicDirectoryCatalog(catalog, state);
  if (!profile || (id === PUBLIC_APPLICATION_ID && !ready))
    return (
      <div className="container profile-page">
        <section className="panel">
          <h1>
            {!ready && id === PUBLIC_APPLICATION_ID
              ? "Loading profile"
              : "Profile unavailable"}
          </h1>
          <p>
            This profile is not publicly available in this tab. Tab-only
            profiles require JavaScript, approval, active membership and no
            suspension. Refresh or reset clears session changes.
          </p>
          <Link className="text-link" href="/directory">
            Back to directory
          </Link>
        </section>
      </div>
    );
  return (
    <ProfileView
      profile={profile}
      catalog={currentCatalog}
      returnTo={safeDirectoryReturn(returnTo, currentCatalog)}
      reviewPage={reviewPage}
      sessionCreated={id === PUBLIC_APPLICATION_ID}
    />
  );
}
