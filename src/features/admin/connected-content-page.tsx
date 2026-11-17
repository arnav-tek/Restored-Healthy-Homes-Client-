import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { adminContent, ContentDataError } from "@/data/supabase/site-content";
import { loadPublicCategoryCatalog } from "@/data/supabase/public-directory";
import { contentQuery } from "@/validation/site-content";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedContent } from "./connected-content";
export async function ConnectedContentPage({
  query,
}: {
  query: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (typeof v !== "string") notFound();
    params.set(k, v);
  }
  const input = contentQuery(params);
  if (!input) notFound();
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  if (!identity) redirect("/login?returnTo=/admin/content");
  let state,
    categories: Awaited<ReturnType<typeof loadPublicCategoryCatalog>> = [],
    error = "";
  try {
    state = await adminContent(client, input);
    categories = await loadPublicCategoryCatalog();
  } catch (e) {
    error =
      e instanceof ContentDataError
        ? e.message
        : "Content is temporarily unavailable.";
  }
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} admin />
      <section id="private-account" className="panel application-form-panel">
        <header className="page-heading">
          <h1>Content management</h1>
          <nav
            className="account-navigation"
            aria-label="Administrator sections"
          >
            <Link href="/admin/applications">Applications</Link>
            <Link href="/admin/featured">Featured listings</Link>
            <Link href="/admin/reports">Reports</Link>
            <Link href="/admin/categories">Categories</Link>
            <Link href="/admin/content" aria-current="page">
              Content
            </Link>
            <Link href="/resources">Public resources</Link>
          </nav>
        </header>
        {state ? (
          <ConnectedContent
            key={identity.id}
            initial={state}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        ) : (
          <p role="alert">{error}</p>
        )}
      </section>
    </div>
  );
}
