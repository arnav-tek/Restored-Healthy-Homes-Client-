import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { loadAdminCredentials } from "@/data/supabase/credential-evidence";
import { parseInboxPage } from "@/validation/connected-inquiry";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { CredentialReviews } from "./credential-reviews";
export async function CredentialReviewPage({
  pageValue,
}: {
  pageValue: string | string[] | undefined;
}) {
  const page =
    typeof pageValue === "string" || pageValue === undefined
      ? parseInboxPage(pageValue ?? null)
      : null;
  if (!page) notFound();
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  if (!identity) redirect("/login?returnTo=/admin/credentials");
  let data;
  try {
    data = await loadAdminCredentials(client, page);
  } catch {}
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} admin />
      <section
        id="private-account"
        className="panel application-form-panel min-w-0 [overflow-wrap:anywhere]"
      >
        <header className="page-heading">
          <h1>Credential reviews</h1>
          <p>
            Review saved claims and private evidence; preserve each decision’s
            actor, reason and history.
          </p>
        </header>
        {data ? (
          <CredentialReviews initial={data} />
        ) : (
          <div role="alert">
            <p>
              Credential reviews are unavailable. Current administrator access
              is required.
            </p>
            <Link href="/admin/credentials">Try again</Link>
          </div>
        )}
      </section>
    </div>
  );
}
