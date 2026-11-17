import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import {
  adminCategories,
  CategoryDataError,
} from "@/data/supabase/admin-categories";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedCategories } from "./connected-categories";
export async function ConnectedCategoriesPage({
  query,
}: {
  query: Record<string, string | string[] | undefined>;
}) {
  if (Object.keys(query).length) notFound();
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  if (!identity) redirect("/login?returnTo=/admin/categories");
  let data,
    error = "";
  try {
    data = await adminCategories(client);
  } catch (e) {
    error =
      e instanceof CategoryDataError
        ? e.message
        : "Categories are temporarily unavailable.";
  }
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} admin />
      <section id="private-account" className="panel application-form-panel">
        <header className="page-heading">
          <h1>Categories</h1>
          <nav
            className="account-navigation"
            aria-label="Administrator sections"
          >
            <Link href="/admin/applications">Applications</Link>
            <Link href="/admin/content">Content</Link>
            <Link href="/admin/featured">Featured listings</Link>
            <Link href="/admin/reports">Reports</Link>
            <Link href="/admin/categories" aria-current="page">
              Categories
            </Link>
            <Link href="/admin/consultations">Consultations</Link>
            <Link href="/pricing">Public pricing</Link>
          </nav>
        </header>
        {data ? (
          <ConnectedCategories key={identity.id} initial={data} />
        ) : (
          <p role="alert">{error}</p>
        )}
      </section>
    </div>
  );
}
