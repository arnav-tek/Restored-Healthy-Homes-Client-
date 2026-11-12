import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { createServerSupabaseClient } from "@/data/supabase/server";
import {
  loadNotificationJobs,
  NotificationOperationError,
} from "@/data/supabase/inquiry-notifications";
import { parseInboxPage } from "@/validation/connected-inquiry";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { InquiryNotificationJobs } from "./inquiry-notification-jobs";

export async function NotificationOperationsPage({
  pageValue,
}: {
  pageValue: string | string[] | undefined;
}) {
  const page =
    typeof pageValue === "string" || pageValue === undefined
      ? parseInboxPage(pageValue ?? null)
      : null;
  if (!page) notFound();
  const client = await createServerSupabaseClient();
  const identity = await authenticatedIdentity(client);
  if (!identity) redirect("/login?returnTo=/admin");
  let jobs,
    failure = "";
  try {
    jobs = await loadNotificationJobs(client, page);
  } catch (error) {
    failure =
      error instanceof NotificationOperationError
        ? error.message
        : "Notification operations are temporarily unavailable.";
  }
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} admin />
      <section
        id="private-account"
        className="panel application-form-panel min-w-0 [overflow-wrap:anywhere]"
      >
        <header className="page-heading">
          <h1>Inquiry email jobs</h1>
          <p>Review notification processing and safely retry known failures.</p>
        </header>
        {jobs ? (
          <InquiryNotificationJobs key={page} initial={jobs} />
        ) : (
          <div role="alert">
            <p>{failure}</p>
            <Link className="text-link" href="/member">
              Your account
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
