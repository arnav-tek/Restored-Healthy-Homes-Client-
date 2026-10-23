"use client";
import Link from "next/link";
import { directoryHref, defaultSearch } from "@/domain/directory-search";
import {
  publicApplicationProfile,
  PUBLIC_APPLICATION_ID,
} from "@/domain/public-application";
import { profileHref } from "@/validation/profile";
import { useDemoSession } from "@/features/member/demo-session";

export function ApplicationPublication({ memberId }: { memberId: string }) {
  const { state } = useDemoSession();
  if (memberId !== PUBLIC_APPLICATION_ID || state.applicationId !== memberId)
    return null;
  const profile = publicApplicationProfile(state);
  return (
    <section className="workspace-note" aria-label="Public application status">
      <p>
        {profile
          ? "This application is now visible in the public directory in this tab."
          : "This application is not public yet. Approval, active membership and no suspension are all required."}
      </p>
      {profile && (
        <div className="admin-inline-actions">
          <Link
            className="text-link"
            href={directoryHref({
              ...defaultSearch,
              q: profile.businessName.slice(0, 100),
            })}
          >
            Find this business in the directory
          </Link>
          <Link className="text-link" href={profileHref(profile.id)}>
            View public profile
          </Link>
        </div>
      )}
      <p className="field-help">
        Use site links to keep this walkthrough in the same tab. Refresh or
        reset clears session listings.
      </p>
    </section>
  );
}
