import type {
  PublicReview,
  PublicReviewSnapshot,
  ReviewFields,
  ReviewRecord,
  ReviewStatus,
} from "./review";
import { publicReviewsFor } from "./review";
import type { DemoIdentity } from "./demo-identity";
import type { DemoSession } from "./demo-member";
import { professionalForMember } from "./professional-association";
import { eligiblePublicIds } from "./public-session";
import { parseReview } from "../validation/review";
import {
  parseModerationNote,
  moderationNoteLimit,
} from "../validation/qa-moderation";
export interface DemoReviewSubmission extends ReviewFields {
  readonly id: string;
  readonly professionalId: string;
  readonly status: "pending";
}
export interface ReviewSession {
  readonly snapshot: PublicReviewSnapshot;
  submissions: readonly DemoReviewSubmission[];
  decisions: Readonly<Record<string, ReviewDecision>>;
  currentByProfessional: Readonly<Record<string, string>>;
  nextSequence: number;
}
export interface ReviewDecision {
  readonly status: "published" | "rejected";
  readonly note: string;
  readonly publishedAt: string;
}
export interface ModeratableReview extends ReviewRecord {
  readonly source: "seed" | "session";
}
export type ReviewAction =
  | { type: "submit-review"; professionalId: string; fields: ReviewFields }
  | { type: "new-review"; professionalId: string }
  | {
      type: "moderate-review";
      id: string;
      status: "published" | "rejected";
      note: string;
    };
export function createReviewSession(
  snapshot: PublicReviewSnapshot = { professionals: [], reviews: [] },
): ReviewSession {
  // Re-project even a typed input: never carry accidental private fields into the session.
  const professionals = snapshot.professionals.map(({ id, businessName }) => ({
    id,
    businessName,
  }));
  const reviews = professionals.flatMap(({ id }) =>
    publicReviewsFor(
      snapshot.reviews.map((review) => ({
        ...review,
        status: "published",
        moderationNote: "",
      })),
      id,
    ),
  );
  return {
    snapshot: { professionals, reviews },
    submissions: [],
    decisions: {},
    currentByProfessional: {},
    nextSequence: 1,
  };
}
export function moderationReviews(state: ReviewSession): ModeratableReview[] {
  // Seed IDs win on collision. Session IDs use a separate namespace; every ID appears once.
  const rows = new Map<string, ModeratableReview>();
  for (const review of state.snapshot.reviews) {
    rows.set(review.id, {
      ...review,
      status: "published",
      moderationNote: "",
      source: "seed",
    });
  }
  for (const review of state.submissions) {
    if (!rows.has(review.id))
      rows.set(review.id, {
        ...review,
        publishedAt: "",
        moderationNote: "",
        source: "session",
      });
  }
  return Array.from(rows.values(), (review) => {
    const decision = state.decisions[review.id];
    return decision
      ? {
          ...review,
          status: decision.status,
          moderationNote: decision.note,
          publishedAt: decision.publishedAt,
        }
      : review;
  });
}
export function publicSessionReviews(
  state: ReviewSession,
  eligibleIds: readonly string[],
  professionalId: string,
): PublicReview[] {
  return eligibleIds.includes(professionalId)
    ? publicReviewsFor(moderationReviews(state), professionalId)
    : [];
}
export function memberReviewView(state: DemoSession): {
  professionalId: string | null;
  reviews: PublicReview[];
} {
  const identity = state.identity;
  const professionalId =
    identity?.kind === "member" &&
    state.records.some((record) => record.id === identity.memberId)
      ? professionalForMember(identity.memberId, state.applicationId)
      : null;
  return {
    professionalId,
    reviews: professionalId
      ? publicSessionReviews(
          state.reviews,
          eligiblePublicIds(state),
          professionalId,
        )
      : [],
  };
}
export function currentReviewSubmission(
  state: ReviewSession,
  professionalId: string,
) {
  const review = moderationReviews(state).find(
    (item) =>
      item.id === state.currentByProfessional[professionalId] &&
      item.source === "session" &&
      item.professionalId === professionalId,
  );
  if (!review) return null;
  const { id, displayName, rating, body, status } = review;
  return { id, displayName, rating, body, status };
}
const transitions: Record<ReviewStatus, readonly ReviewDecision["status"][]> = {
  pending: ["published", "rejected"],
  published: ["published", "rejected"],
  rejected: ["published", "rejected"],
};
function nextPublication(rows: readonly ModeratableReview[]): string {
  // A deterministic fictional clock, one second after the latest sample publication.
  // Retain metadata on rejection so republication advances; never accept a form timestamp.
  const latest = rows.reduce(
    (time, row) => Math.max(time, Date.parse(row.publishedAt) || 0),
    Date.UTC(2026, 0, 1),
  );
  return new Date(latest + 1000).toISOString();
}
export function reduceReviewAction(
  state: ReviewSession,
  action: ReviewAction,
  eligibleIds: readonly string[],
  identity: DemoIdentity | null = null,
): ReviewSession {
  if (action.type === "moderate-review") {
    // Interface simulation only, never a production authorization boundary.
    if (identity?.kind !== "admin") return state;
    const rows = moderationReviews(state);
    const review = rows.find((row) => row.id === action.id);
    const note = parseModerationNote(action.note);
    if (
      !review ||
      !eligibleIds.includes(review.professionalId) ||
      note === null ||
      typeof action.note !== "string" ||
      action.note.length > moderationNoteLimit ||
      !transitions[review.status].includes(action.status)
    )
      return state;
    if (review.status === action.status && review.moderationNote === note)
      return state;
    const decision: ReviewDecision = {
      status: action.status,
      note,
      publishedAt:
        action.status === "published" && review.status !== "published"
          ? nextPublication(rows)
          : review.publishedAt,
    };
    return {
      ...state,
      decisions: { ...state.decisions, [review.id]: decision },
    };
  }
  // IDs come from the existing public directory snapshot, not a second catalog or form field.
  if (!eligibleIds.includes(action.professionalId)) return state;
  if (action.type === "new-review") {
    if (!state.currentByProfessional[action.professionalId]) return state;
    const currentByProfessional = { ...state.currentByProfessional };
    delete currentByProfessional[action.professionalId];
    return { ...state, currentByProfessional };
  }
  if (state.currentByProfessional[action.professionalId]) return state;
  const parsed = parseReview({ ...action.fields });
  if (!parsed.ok) return state;
  const record: DemoReviewSubmission = {
    id: `demo-session-review-${state.nextSequence}`,
    professionalId: action.professionalId,
    displayName: parsed.fields.displayName,
    rating: parsed.fields.rating,
    body: parsed.fields.body,
    status: "pending",
  };
  return {
    ...state,
    submissions: [...state.submissions, record],
    currentByProfessional: {
      ...state.currentByProfessional,
      [record.professionalId]: record.id,
    },
    nextSequence: state.nextSequence + 1,
  };
}
