"use client";
import Link from "next/link";
import { memberReviewView } from "@/domain/review-session";
import { useDemoSession } from "@/features/member/demo-session";
import { ReviewList, ReviewSummary } from "./review-content";

export function MemberReviews() {
  const { state } = useDemoSession();
  const { professionalId, reviews } = memberReviewView(state);
  if (!professionalId)
    return (
      <div className="workspace-empty">
        <h2>No public professional linked to this account</h2>
        <p>
          Reviews appear here when your account is linked to a public professional profile.
        </p>
      </div>
    );
  if (!state.publicProfessionalIds.includes(professionalId))
    return (
      <p className="workspace-empty">
        Your linked public profile is unavailable. Reviews are not displayed for an ineligible profile.
      </p>
    );
  return (
    <section
      className="member-reviews"
      aria-label="Your published reviews"
    >
      <p>
        Published reviews for your professional profile. Pending and rejected reviews are excluded.
      </p>
      <p className="field-help">
        Admin review decisions affect this tab only. Member listing edits remain
        separate from the public-directory snapshot. Refresh or reset restores
        the original samples.
      </p>
      <Link
        className="text-link"
        href={`/professionals/${professionalId}#reviews`}
      >
        View your public reviews
      </Link>
      <ReviewSummary reviews={reviews} />
      <ReviewList reviews={reviews} />
    </section>
  );
}
