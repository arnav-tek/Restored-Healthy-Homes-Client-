"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Users, FileText, Eye } from "lucide-react";
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
            Choose Your submitted application in Quick access on the sign-in page. This opens a simulated member account; no real account is created.
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
          <div className="application-intro-header">
            <div className="application-intro-left">
              <h2>Your business</h2>
              <p className="application-intro-sub">
                All fields are required unless marked optional.
              </p>
            </div>
            <div className="application-info-panel">
              <div className="application-info-item">
                <div className="application-info-badge" aria-hidden="true">
                  <Users size={15} />
                </div>
                <div className="application-info-text">
                  <strong>Join our professional directory</strong>
                  <p>Reach people looking for healthy-home professionals.</p>
                </div>
              </div>
              <div className="application-info-item">
                <div className="application-info-badge" aria-hidden="true">
                  <FileText size={15} />
                </div>
                <div className="application-info-text">
                  <strong>Reviewed by our team</strong>
                  <p>Applications are reviewed before being published.</p>
                </div>
              </div>
              <div className="application-info-item">
                <div className="application-info-badge" aria-hidden="true">
                  <Eye size={15} />
                </div>
                <div className="application-info-text">
                  <strong>This is a demo application</strong>
                  <p>Application delivery is not connected yet.</p>
                </div>
              </div>
            </div>
          </div>
          <ProfileFieldsForm
            key={state.revision}
            catalog={sessionCatalog}
            submitLabel="Create application"
            variant="application"
            onValid={(profile) => dispatch({ type: "submit", profile })}
          />
        </section>
      )}
      <p><Link className="text-link" href="/demo/walkthrough">Follow the client walkthrough →</Link></p>
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
