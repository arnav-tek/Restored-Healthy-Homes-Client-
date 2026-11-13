import Link from "next/link";
import type { MemberReviewsWorkspace } from "@/domain/connected-reviews";
import { ReviewSummary, ReviewList } from "./review-content";
export function ConnectedMemberReviews({
  data,
}: {
  data: MemberReviewsWorkspace;
}) {
  return (
    <section className="panel member-reviews min-w-0 [overflow-wrap:anywhere]">
      {data.professionalId ? (
        <>
          <ReviewSummary reviews={data.reviews} />
          <ReviewList reviews={data.reviews} />
          {!!data.reviews.length && (
            <Link href={`/professionals/${data.professionalId}#reviews`}>
              View your public reviews
            </Link>
          )}
          {!data.reviews.length && (
            <p className="workspace-empty">
              No published reviews are available for your eligible profile.
              Unavailable listings and unpublished reviews are excluded.
            </p>
          )}
        </>
      ) : (
        <p className="workspace-empty">
          No professional profile is linked to this account.
        </p>
      )}
    </section>
  );
}
