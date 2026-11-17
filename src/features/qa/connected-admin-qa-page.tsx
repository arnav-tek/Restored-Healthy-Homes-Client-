import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { loadAdminQa, QaAdminError } from "@/data/supabase/qa-admin";
import { parseQaAdminFilters } from "@/validation/qa-admin";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedAdminQa } from "./connected-admin-qa";
export async function ConnectedAdminQaPage({
  query,
}: {
  query: Record<string, string | string[] | undefined>;
}) {
  const filters = parseQaAdminFilters(query);
  if (!filters) notFound();
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  if (!identity) redirect("/login?returnTo=/admin/questions");
  let data,
    missing = false,
    error = "";
  try {
    data = await loadAdminQa(client, filters);
  } catch (e) {
    missing = e instanceof QaAdminError && e.status === 404;
    error =
      e instanceof QaAdminError
        ? e.message
        : "Moderation is temporarily unavailable.";
  }
  if (missing) notFound();
  return (
    <div className="container qa-page">
      <SessionBoundary identityId={identity.id} admin />
      <section id="private-account">
        <header className="page-heading">
          <h1>Q&A moderation</h1>
          <p>
            Review saved questions and specialist answers. Publication and
            rejection decisions are saved with a reason and history.
          </p>
        </header>
        <nav
          className="admin-inline-actions"
          aria-label="Administrator sections"
        >
          <Link href="/admin/applications">Application management</Link>
          <Link href="/admin/credentials">Credential reviews</Link>
        </nav>
        {data ? (
          <ConnectedAdminQa data={data} filters={filters} />
        ) : (
          <div className="workspace-empty" role="alert">
            <h2>Moderation unavailable</h2>
            <p>{error}</p>
            <Link href="/admin/questions">Try loading the queue again</Link>
          </div>
        )}
      </section>
    </div>
  );
}
