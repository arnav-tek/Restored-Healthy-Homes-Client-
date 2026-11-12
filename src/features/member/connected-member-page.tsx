import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/data/supabase/server";
import { authenticatedIdentity } from "@/data/supabase/auth";
import { MemberDataError } from "@/data/supabase/member-account";
import { SessionBoundary } from "@/features/auth/session-boundary";
import { ConnectedMemberNav } from "./connected-member-nav";
import { ConnectedProfile } from "./connected-profile";
import {
  ConnectedAccountOverview,
  ConnectedMembership,
} from "./connected-account-content";
import { loadAccountWorkspace } from "@/data/supabase/account-workspace";

const views = {
  account: {
    path: "/member",
    title: "Your account",
    description: "An overview of your application, membership and listing.",
  },
  profile: {
    path: "/member/profile",
    title: "Your profile",
    description: "Manage the business details saved to your account.",
  },
  membership: {
    path: "/member/membership",
    title: "Membership",
    description: "View your saved membership status and availability.",
  },
  application: {
    path: "/list-your-business",
    title: "List Your Business",
    description:
      "Introduce your business, services and professional specialties.",
  },
} as const;

export async function ConnectedMemberPage({
  view = "profile",
}: {
  view?: keyof typeof views;
}) {
  const page = views[view];
  const client = await createServerSupabaseClient();
  const identity = await authenticatedIdentity(client);
  if (!identity) redirect(`/login?returnTo=${encodeURIComponent(page.path)}`);
  let administrator = false;
  let workspace,
    failure = "";
  try {
    const account = await loadAccountWorkspace(client);
    if (account.kind === "admin") administrator = true;
    else workspace = account.workspace;
  } catch (error) {
    failure =
      error instanceof MemberDataError
        ? error.message
        : "Your saved account data is temporarily unavailable. Please try again later.";
  }
  if (administrator) redirect("/admin");
  return (
    <div className="container application-page">
      <SessionBoundary identityId={identity.id} />
      <section id="private-account" className="panel application-form-panel min-w-0 [overflow-wrap:anywhere]">
        <ConnectedMemberNav current={page.path} />
        <header className="page-heading">
          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </header>
        {workspace ? (
          view === "account" ? (
            <ConnectedAccountOverview workspace={workspace} />
          ) : view === "membership" ? (
            <ConnectedMembership workspace={workspace} />
          ) : (
            <ConnectedProfile initial={workspace} />
          )
        ) : (
          <>
            <p role="alert" className="notice">
              {failure}
            </p>
            <Link className="text-link" href={page.path}>
              Try loading your saved details again
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
