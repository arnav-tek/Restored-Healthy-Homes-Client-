import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import {
  loadConsultations,
  ConsultationDataError,
} from "@/data/supabase/consultations";
import { parseInboxPage } from "@/validation/connected-inquiry";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedMemberNav } from "@/features/member/connected-member-nav";
import { ConnectedConsultationWorkspace } from "./connected-workspace";
export async function ConnectedConsultationPage({
  admin,
  query,
}: {
  admin: boolean;
  query: Record<string, string | string[] | undefined>;
}) {
  const page =
    typeof query.page === "string" || query.page === undefined
      ? parseInboxPage(query.page ?? null)
      : null;
  if (!page || Object.keys(query).some((k) => k !== "page")) notFound();
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  if (!identity)
    redirect(`/login?returnTo=/${admin ? "admin" : "member"}/consultations`);
  let data,
    error = "";
  try {
    data = await loadConsultations(client, admin, page);
  } catch (e) {
    error =
      e instanceof ConsultationDataError
        ? e.message
        : "Consultations are unavailable.";
  }
  return (
    <div className="container section">
      <SessionBoundary identityId={identity.id} admin={admin} />
      <section id="private-account">
        <header className="page-heading">
          {admin ? (
            <Link href="/admin">Application management</Link>
          ) : (
            <ConnectedMemberNav current="/member/consultations" />
          )}
          <h1>{admin ? "Consultation coordination" : "Your consultations"}</h1>
        </header>
        <ConnectedConsultationWorkspace
          key={`${identity.id}:${admin ? "admin" : "member"}`}
          initial={data ?? { page, items: [], candidates: [], hasNext: false }}
          initialError={error}
          admin={admin}
        />
      </section>
    </div>
  );
}
