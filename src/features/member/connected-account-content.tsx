import Link from "next/link";
import type { MemberWorkspace } from "@/domain/member-account";

export function ConnectedAccountOverview({
  workspace,
}: {
  workspace: MemberWorkspace;
}) {
  const application = workspace.application;
  if (!application)
    return (
      <section>
        <h2>Start your business application</h2>
        <p>
          Your account is ready. Add your business details to submit an
          application for review.
        </p>
        <Link className="button" href="/list-your-business">
          Start application
        </Link>
      </section>
    );
  return (
    <section>
      <h2>{application.profile.businessName}</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt>Application</dt>
          <dd>{application.approval}</dd>
        </div>
        <div>
          <dt>Membership</dt>
          <dd>{application.membership.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Listing status</dt>
          <dd>
            {application.suspended
              ? "Suspended"
              : application.approval === "approved" &&
                  application.membership === "active"
                ? "Published"
                : "Not published"}
          </dd>
        </div>
      </dl>
      {application.decisionReason && (
        <p>Application decision: {application.decisionReason}</p>
      )}
      {application.suspensionReason && (
        <p>Listing update: {application.suspensionReason}</p>
      )}
      <p>
        <Link className="text-link" href="/member/profile">
          Edit your business profile
        </Link>
      </p>
    </section>
  );
}

export function ConnectedMembership({
  workspace,
}: {
  workspace: MemberWorkspace;
}) {
  return (
    <section>
      <h2>Membership status</h2>
      <p>
        {workspace.application
          ? `Your saved membership status is ${workspace.application.membership.replaceAll("_", " ")}.`
          : "No membership has been created yet. Start with your business application."}
      </p>
      <p>
        Application approval and membership are separate. Approval does not
        activate a membership.
      </p>
      <p className="notice">
        Payments and membership activation are not connected yet. No payment can
        be taken from this page.
      </p>
      <Link
        className="text-link"
        href={workspace.application ? "/member" : "/list-your-business"}
      >
        {workspace.application
          ? "View your account overview"
          : "Start your business application"}
      </Link>
    </section>
  );
}
