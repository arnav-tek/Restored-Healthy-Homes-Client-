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
            Application prepared
          </h2>
          <p>
            <strong>Application status: {application.approval}.</strong>{" "}
            {application.profile.businessName} is ready to review in your member workspace. Delivery to the owner is not connected yet.
          </p>
          {application.decisionReason && (
            <p>Decision reason: {application.decisionReason}</p>
          )}
          <p>
            Choose your prepared application on the sign-in page to open its member workspace.
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
            Open member workspace
          </Link>
        </section>
      ) : (
        <section className="panel application-form-panel">
          <h2>Your business</h2>
          <ProfileFieldsForm
            key={state.revision}
            catalog={sessionCatalog}
            submitLabel="Create application"
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
