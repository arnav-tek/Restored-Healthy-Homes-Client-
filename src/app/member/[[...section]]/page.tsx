import { ConnectedReviewPages } from "@/features/reviews/connected-review-pages";
import { ConnectedConsultationPage } from "@/features/consultations/connected-pages";
import { ConnectedMemberQa } from "@/features/qa/connected-member-qa";
import { notFound, redirect } from "next/navigation";
import { applicationMode } from "@/domain/config";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedMemberNav } from "@/features/member/connected-member-nav";
import { ConnectedMemberPage } from "@/features/member/connected-member-page";
import { ConnectedInboxPage } from "@/features/member/connected-inbox-page";
import { inquiryUuid, parseInboxPage } from "@/validation/connected-inquiry";
import Link from "next/link";
export const metadata = { title: "Your account" };
export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (applicationMode(process.env) !== "staging") notFound();
  const { section = [] } = await params;
  if (section.length === 1 && section[0] === "consultations")
    return <ConnectedConsultationPage admin={false} query={await searchParams}/>;
  if (!section.length || (section.length === 1 && section[0] === "profile"))
    return (
      <ConnectedMemberPage view={!section.length ? "account" : "profile"} />
    );
  if (section.length === 1 && section[0] === "membership")
    return <ConnectedMemberPage view="membership" />;
  if (section.length === 1 && section[0] === "reviews")
    return <ConnectedReviewPages member query={await searchParams} />;
  if (section[0] === "questions" && section.length <= 2) {
    if (section[1] && !inquiryUuid.test(section[1])) notFound();
    const query = await searchParams;
    const page =
      typeof query.page === "string" || query.page === undefined
        ? parseInboxPage(query.page ?? null)
        : null;
    if (!page || Object.keys(query).some((k) => k !== "page")) notFound();
    return <ConnectedMemberQa id={section[1]} page={page} />;
  }
  if (section[0] === "inquiries" && section.length <= 2) {
    if (section[1] && !inquiryUuid.test(section[1])) notFound();
    const query = await searchParams;
    const page =
      typeof query.page === "string" || query.page === undefined
        ? parseInboxPage(query.page ?? null)
        : null;
    if (!page || Object.keys(query).some((key) => key !== "page")) notFound();
    return <ConnectedInboxPage id={section[1]} page={page} />;
  }
  if (
    section.length !== 1 ||
    ![
      "inquiries",
      "billing",
      "membership",
      "reviews",
      "questions",
      "consultations",
    ].includes(section[0])
  )
    notFound();
  const identity = await authenticatedIdentity(
    await createServerSupabaseClient(),
  );
  if (!identity) redirect("/login?returnTo=%2Fmember");
  return (
    <div className="container section">
      <SessionBoundary identityId={identity.id} />
      <section id="private-account" className="panel">
        <ConnectedMemberNav current={`/member/${section[0]}`} />
        <h1>{section[0].charAt(0).toUpperCase() + section[0].slice(1)}</h1>
        <p>You are signed in with a confirmed email address.</p>
        <p>
          This account section is not connected yet. Your saved application and
          profile are available from Profile.
        </p>
        <Link className="button" href="/member/profile">
          Edit your profile
        </Link>
      </section>
    </div>
  );
}
