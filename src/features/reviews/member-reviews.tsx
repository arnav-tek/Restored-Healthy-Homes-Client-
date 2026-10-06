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
        <h2>No public professional linked to this demo account</h2>
        <p>
          The sample studios are independent examples. Switch demo accounts and
          choose Fern & Field Inspections or Cedar Path Remediation to explore
          their published reviews.
        </p>
      </div>
    );
  if (!state.publicProfessionalIds.includes(professionalId))
    return (
      <p className="workspace-empty">
        Your linked public profile is unavailable in this session. Reviews are
        not displayed for an ineligible profile.
      </p>
    );
  return (
    <section
      className="member-reviews"
      aria-label="Your published fictional reviews"
    >
      <p>
        Published fictional reviews for your explicitly linked public profile.
        These are not verified customer experiences. Pending/rejected reviews
        and internal moderation notes are excluded.
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
        View your public review preview
      </Link>
      <ReviewSummary reviews={reviews} />
      <ReviewList reviews={reviews} />
    </section>
  );
}
