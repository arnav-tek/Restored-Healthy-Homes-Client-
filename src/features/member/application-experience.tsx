"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { SessionReset } from "@/features/dashboard/session-reset";
import {
  ProfileFieldsForm,
  type ApplicationCategory,
} from "./profile-fields-form";
import { useDemoSession, useDemoCatalog } from "./demo-session";

export function ApplicationExperience({
  catalog,
}: {
  catalog: readonly ApplicationCategory[];
}) {
  const { state, dispatch } = useDemoSession();
  const sessionCatalog = useDemoCatalog(catalog);
  const heading = useRef<HTMLHeadingElement>(null);
  const application = state.records.find(
    (record) => record.id === state.applicationId,
  );
  useEffect(() => {
    if (application) heading.current?.focus();
  }, [application]);
  return (
    <>
      {application ? (
        <section className="panel application-confirmation">
          <h2 ref={heading} tabIndex={-1}>
            Demo application created
          </h2>
          <p>
            <strong>Application status: {application.approval}.</strong>{" "}
            {application.profile.businessName} is available in this tab’s member
            preview. It has not been sent to the owner or published.
          </p>
          {application.decisionReason && (
            <p>Demo decision reason: {application.decisionReason}</p>
          )}
          <p>
            Nothing is saved permanently. Refreshing or resetting clears this
            application. This creates no real account. Use the
            submitted-application preset on Demo sign-in to explore its member
            preview.
          </p>
          <Link
            className="button"
            href={
              state.identity?.kind === "member" &&
              state.identity.memberId === application.id
                ? "/demo/member"
                : "/login?account=application&returnTo=%2Fdemo%2Fmember"
            }
          >
            Open demo member workspace
          </Link>
        </section>
      ) : (
        <section className="panel application-form-panel">
          <h2>Your sample business</h2>
          <ProfileFieldsForm
            key={state.revision}
            catalog={sessionCatalog}
            submitLabel="Create demo application"
            onValid={(profile) => dispatch({ type: "submit", profile })}
          />
        </section>
      )}
      <div className="session-reset">
        <SessionReset />
        <p>
          Clears applications, edits, category labels and review decisions in
          this tab.
        </p>
      </div>
      <p role="status" className="session-status">
        {state.notice}
      </p>
    </>
  );
}
