import { notFound, redirect } from "next/navigation";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { InboxError, loadInbox, loadInquiry } from "@/data/supabase/inbox";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedMemberNav } from "./connected-member-nav";
import { ConnectedInquiryDetail } from "./connected-inquiry-detail";
import { ConnectedInboxList } from "./connected-inbox-list";
import { InboxReloadLink } from "./connected-inbox-link";

export async function ConnectedInboxPage({
  id,
  page = 1,
}: {
  id?: string;
  page?: number;
}) {
  const path = id
    ? `/member/inquiries/${id}`
    : `/member/inquiries?page=${page}`;
  const client = await createServerSupabaseClient();
  const identity = await authenticatedIdentity(client);
  if (!identity)
    redirect(`/login?returnTo=${encodeURIComponent("/member/inquiries")}`);
  let inbox,
    detail,
    failure = "";
  try {
    if (id) detail = await loadInquiry(client, id);
    else inbox = await loadInbox(client, page);
  } catch (error) {
    failure =
      error instanceof InboxError
        ? error.message
        : "Your inbox is temporarily unavailable. Please try again.";
  }
  if (id && detail === null) notFound();
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} />
      <section
        id="private-account"
        className="panel application-form-panel min-w-0 [overflow-wrap:anywhere]"
      >
        <ConnectedMemberNav current="/member/inquiries" />
        <header className="page-heading">
          <h1>Your inquiries</h1>
          <p>
            Messages saved from your public professional profile, independently
            of email notifications.
          </p>
        </header>
        {id && (
          <p>
            <InboxReloadLink href="/member/inquiries">
              ← Back to inbox
            </InboxReloadLink>
          </p>
        )}
        {failure && (
          <div role="alert">
            <p className="notice">{failure}</p>
            <InboxReloadLink href={path}>
              Try loading your inbox again
            </InboxReloadLink>
          </div>
        )}
        {detail && (
          <ConnectedInquiryDetail
            key={`${detail.id}-${detail.version}`}
            initial={detail}
          />
        )}
        {inbox && <ConnectedInboxList inbox={inbox} />}
      </section>
    </div>
  );
}
