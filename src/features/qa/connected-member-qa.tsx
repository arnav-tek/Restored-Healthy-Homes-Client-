import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { memberQa } from "@/data/supabase/qa";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedMemberNav } from "@/features/member/connected-member-nav";
import { MemberQaView } from "./member-qa-view";
export async function ConnectedMemberQa({
  id,
  page = 1,
}: {
  id?: string;
  page?: number;
}) {
  const client = await createServerSupabaseClient(),
    identity = await authenticatedIdentity(client);
  const path = id ? `/member/questions/${id}` : "/member/questions";
  if (!identity) redirect(`/login?returnTo=${encodeURIComponent(path)}`);
  let data;
  try {
    data = await memberQa(client, id ?? null, page);
  } catch {
    return (
      <div className="container section">
        <SessionBoundary identityId={identity.id} />
        <section id="private-account" className="panel">
          <ConnectedMemberNav current="/member/questions" />
          <h1>Category questions</h1>
          <p role="alert">
            Your category inbox is unavailable. A confirmed member account and
            current participation eligibility are required.
          </p>
          <Link href={path}>Try loading again</Link>
        </section>
      </div>
    );
  }
  return (
    <>
      <SessionBoundary identityId={identity.id} />
      <MemberQaView data={data} id={id} page={page} />
    </>
  );
}
