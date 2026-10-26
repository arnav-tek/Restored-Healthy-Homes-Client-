"use client";
import Link from "next/link";
import { directoryHref, defaultSearch } from "@/domain/directory-search";
import { publicSessionProfiles } from "@/domain/public-session";
import { professionalForMember } from "@/domain/professional-association";
import { profileHref } from "@/validation/profile";
import { useDemoSession } from "@/features/member/demo-session";

export function ApplicationPublication({ memberId }: { memberId: string }) {
  const { state } = useDemoSession();
  const id = professionalForMember(memberId, state.applicationId);
  if (!id) return null;
  const profile = publicSessionProfiles(state).find((item) => item.id === id);
  return (
    <section className="workspace-note" aria-label="Public listing status">
      <p>
        {profile
          ? "This business is visible in the public directory in this tab."
          : "This business is not public. Approval, active membership and no suspension are all required."}
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
        </div>
      )}
      <Link className="text-link" href={profileHref(id)}>View public profile</Link>
      <p className="field-help">
        Use site links to keep this walkthrough in the same tab. Refresh or
        reset clears session listings.
      </p>
    </section>
  );
}
