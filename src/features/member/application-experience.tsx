"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useDemoReady } from "@/components/ui/use-demo-ready";
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
  const ready = useDemoReady();
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
            application.
          </p>
          <Link
            className="button"
            href="/demo/member"
            onClick={() => dispatch({ type: "select", id: application.id })}
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
        <Button
          type="button"
          disabled={!ready}
          onClick={() => dispatch({ type: "reset" })}
        >
          Reset demo session
        </Button>
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
