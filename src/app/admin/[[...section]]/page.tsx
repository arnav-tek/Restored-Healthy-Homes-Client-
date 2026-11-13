import { ConnectedReviewPages } from "@/features/reviews/connected-review-pages";
import { ConnectedAdminQaPage } from "@/features/qa/connected-admin-qa-page";
import { CredentialReviewPage } from "@/features/admin/credential-review-page";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { applicationMode } from "@/domain/config";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { loadAdminWorkspace } from "@/data/supabase/admin-account";
import { MemberDataError } from "@/data/supabase/member-account";
import { ConnectedAdmin } from "@/features/admin/connected-admin";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { NotificationOperationsPage } from "@/features/admin/notification-operations-page";
export const metadata = { title: "Application management" };
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (applicationMode(process.env) === "demo") redirect("/demo/admin");
  const parts = (await params).section ?? [];
  if (parts.length === 1 && parts[0] === "reviews")
    return <ConnectedReviewPages query={await searchParams} />;
  if (parts.length === 1 && parts[0] === "questions")
    return <ConnectedAdminQaPage query={await searchParams} />;
  if (parts.length === 1 && parts[0] === "credentials")
    return <CredentialReviewPage pageValue={(await searchParams).page} />;
  if (parts.length === 1 && parts[0] === "notifications")
    return <NotificationOperationsPage pageValue={(await searchParams).page} />;
  if (
    parts.length > 2 ||
    (parts[0] && !["applications", "listings"].includes(parts[0]))
  )
    notFound();
  const client = await createServerSupabaseClient();
  const identity = await authenticatedIdentity(client);
  if (!identity) redirect("/login?returnTo=/admin");
  let workspace;
  try {
    workspace = await loadAdminWorkspace(client);
  } catch (error) {
    return (
      <div className="container application-page">
        <section className="panel application-form-panel">
          <h1>
            {error instanceof MemberDataError && error.kind === "denied"
              ? "Administrator access required"
              : "Application service unavailable"}
          </h1>
          <p role="alert">
            {error instanceof MemberDataError
              ? error.message
              : "Please try again later."}
          </p>
          <Link href="/member">Your account</Link>
        </section>
      </div>
    );
  }
  if (parts[1] && !workspace.applications.some((a) => a.id === parts[1]))
    notFound();
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} admin />
      <section id="private-account" className="panel application-form-panel">
        <h1>Application management</h1>
        <ConnectedAdmin
          initial={workspace}
          section={parts[0] ?? "applications"}
          selectedId={parts[1]}
        />
      </section>
    </div>
  );
}
