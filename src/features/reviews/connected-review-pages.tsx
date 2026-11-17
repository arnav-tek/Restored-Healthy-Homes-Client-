import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import {
  loadMemberReviews,
  loadAdminReviews,
  ReviewDataError,
} from "@/data/supabase/reviews";
import { parseReviewFilters } from "@/validation/connected-reviews";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedMemberNav } from "@/features/member/connected-member-nav";
import { ConnectedMemberReviews } from "./connected-member-reviews";
import { ConnectedAdminReviews } from "./connected-admin-reviews";
export async function ConnectedReviewPages({
  query,
  member = false,
}: {
  query: Record<string, string | string[] | undefined>;
  member?: boolean;
}) {
  const filters = parseReviewFilters(query);
  if (!filters || (member && Object.keys(query).length)) notFound();
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  if (!identity)
    redirect(
      `/login?returnTo=${member ? "/member/reviews" : "/admin/reviews"}`,
    );
  let own,
    admin,
    missing = false,
    error = "";
  try {
    if (member) own = await loadMemberReviews(client);
    else admin = await loadAdminReviews(client, filters);
  } catch (e) {
    missing = e instanceof ReviewDataError && e.status === 404;
    error =
      e instanceof ReviewDataError
        ? e.message
        : "Reviews are temporarily unavailable.";
  }
  if (missing) notFound();
  return (
    <div className="container qa-page">
      <SessionBoundary identityId={identity.id} admin={!member} />
      <section id="private-account">
        {member ? (
          <ConnectedMemberNav current="/member/reviews" />
        ) : (
          <nav
            className="admin-inline-actions"
            aria-label="Administrator sections"
          >
            <Link href="/admin/applications">Application management</Link>
            <Link href="/admin/questions">Q&A moderation</Link>
          </nav>
        )}
        <header className="page-heading">
          <h1>{member ? "Your published reviews" : "Review moderation"}</h1>
          <p>
            {member
              ? "Published reviews for your linked eligible profile. Pending, hidden and rejected content stays private; members cannot change customer scores or publish reviews."
              : "Review saved submissions and publication history. Scores and customer text are read-only."}
          </p>
        </header>
        {own ? (
          <ConnectedMemberReviews data={own} />
        ) : admin ? (
          <ConnectedAdminReviews data={admin} filters={filters} />
        ) : (
          <div role="alert" className="workspace-empty">
            <p>{error}</p>
            <Link href={member ? "/member/reviews" : "/admin/reviews"}>
              Try again
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
