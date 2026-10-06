export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ReviewStatus = "pending" | "published" | "rejected";
export interface ReviewFields {
  displayName: string;
  rating: ReviewRating;
  body: string;
}
export interface ReviewRecord extends ReviewFields {
  readonly id: string;
  readonly professionalId: string;
  status: ReviewStatus;
  publishedAt: string;
  moderationNote: string;
  privateContact?: string;
}
// Explicit public allowlist; no publication decisions, contact or internal notes.
export interface PublicReview {
  id: string;
  professionalId: string;
  displayName: string;
  rating: ReviewRating;
  body: string;
  publishedAt: string;
}
export interface ReviewProfessional {
  readonly id: string;
  readonly businessName: string;
}
export interface PublicReviewSnapshot {
  readonly professionals: readonly ReviewProfessional[];
  readonly reviews: readonly PublicReview[];
}
export function isReviewRating(value: unknown): value is ReviewRating {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}
export function publicReviewsFor(
  records: readonly ReviewRecord[],
  professionalId: string,
): PublicReview[] {
  return records
    .filter(
      (record) =>
        record.professionalId === professionalId &&
        record.status === "published" &&
        isReviewRating(record.rating),
    )
    .map((record) => ({
      id: record.id,
      professionalId: record.professionalId,
      displayName: record.displayName,
      rating: record.rating,
      body: record.body,
      publishedAt: record.publishedAt,
    }))
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
    );
}
export function summarizeReviews(reviews: readonly PublicReview[]): {
  count: number;
  average: number | null;
} {
  return {
    count: reviews.length,
    average: reviews.length
      ? Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : null,
  };
}
export const reviewPageSize = 3;
