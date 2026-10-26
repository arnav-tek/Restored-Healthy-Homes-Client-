"use client";
import Link from "next/link";
import type { Category } from "@/domain/categories";
import {
  publicApplicationProfile,
  publicDirectoryCatalog,
} from "@/domain/public-application";
import { useDemoSession } from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { safeDirectoryReturn } from "@/validation/profile";
import { ProfileView } from "./profile-view";

export function ApplicationProfile({
  catalog,
  returnTo,
}: {
  catalog: readonly Category[];
  returnTo?: string | string[];
}) {
  const { state } = useDemoSession();
  const ready = useDemoReady();
  const profile = publicApplicationProfile(state);
  const currentCatalog = publicDirectoryCatalog(catalog, state);
  if (!ready || !profile)
    return (
      <div className="container profile-page">
        <section className="panel">
          <h1>{ready ? "Profile unavailable" : "Loading profile"}</h1>
          <p>
            {ready
              ? "This profile is not publicly available in this tab. Session listings require approval, active membership and no suspension. Refresh or reset clears them."
              : "Tab-only profiles require JavaScript and the current session. Refreshing does not restore a submitted application."}
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
      reviewPage={undefined}
      sessionCreated
    />
  );
}
