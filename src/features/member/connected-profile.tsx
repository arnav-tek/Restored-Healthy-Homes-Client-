"use client";

import { CredentialEvidenceEditor } from "./credential-evidence-editor";
import { ProfileMediaEditor } from "./profile-media-editor";
import { PublicLocationEditor } from "./public-location-editor";
import { ConsultationPreference } from "./consultation-preference";
import Link from "next/link";
import { useRef, useState } from "react";
import type { MemberWorkspace } from "@/domain/member-account";
import type { MemberProfileFields } from "@/domain/demo-member";
import { ProfileFieldsEditor } from "./profile-fields-editor";

export function ConnectedProfile({ initial }: { initial: MemberWorkspace }) {
  const [workspace, setWorkspace] = useState(initial);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [conflict, setConflict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formRevision, setFormRevision] = useState(0);
  const feedback = useRef<HTMLParagraphElement>(null);
  const application = workspace.application;
  async function save(profile: MemberProfileFields) {
    setFailure("");
    setMessage("");
    setConflict(false);
    try {
      const response = await fetch("/api/member/application", {
        method: application ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          ...(application ? { version: application.version } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFailure(data.error || "Unable to save. Your draft is still here.");
        setConflict(response.status === 409);
        return false;
      }
      setWorkspace(data as MemberWorkspace);
      setFormRevision((v) => v + 1);
      setMessage(
        application
          ? "Your profile changes are saved."
          : "Your application is saved and pending review. Membership remains inactive; no payment was taken.",
      );
      return true;
    } catch {
      setFailure(
        "Unable to reach the account service. Your draft is still here; please try again.",
      );
      return false;
    } finally {
      requestAnimationFrame(() => feedback.current?.focus());
    }
  }
  async function loadSaved() {
    setLoading(true);
    try {
      const response = await fetch("/api/member/application", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        setFailure(
          data.error ||
            "Saved profile is unavailable. Your draft is still here.",
        );
        return;
      }
      setWorkspace(data as MemberWorkspace);
      setFormRevision((v) => v + 1);
      setConflict(false);
      setFailure("");
      setMessage("Saved profile loaded.");
    } catch {
      setFailure("Could not load the saved profile. Your draft is still here.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      {application && (
        <p>
          Application: <strong>{application.approval}</strong> · Membership:{" "}
          <strong>{application.membership}</strong>
          {application.suspended && " · Listing suspended"}
        </p>
      )}
      {application?.decisionReason && (
        <p>Application decision: {application.decisionReason}</p>
      )}
      {application?.suspensionReason && (
        <p>Listing status update: {application.suspensionReason}</p>
      )}
      <p className="field-help">
        Only profile details can be changed here. Edits do not change approval,
        membership, suspension or credential decisions. New or changed
        credential claims need review. Profile images have their own save
        controls below.
      </p>
      <p
        ref={feedback}
        tabIndex={-1}
        role={failure ? "alert" : "status"}
        className={failure ? "field-error" : "session-status"}
      >
        {failure || message}
      </p>
      {conflict && (
        <div className="notice">
          <p>
            Your draft remains in the form.{" "}
            <Link href="/member/profile" target="_blank" rel="noopener">
              Open the saved profile in another tab to compare
            </Link>
            .
          </p>
          <button
            type="button"
            className="button button-secondary"
            disabled={loading}
            onClick={loadSaved}
          >
            {loading ? "Loading…" : "Discard draft and load saved profile"}
          </button>
        </div>
      )}
      <ProfileFieldsEditor
        key={formRevision}
        catalog={workspace.catalog}
        initial={application?.profile}
        disabled={loading}
        variant={application ? "workspace" : "application"}
        submitLabel={application ? "Save profile" : "Submit application"}
        onValid={save}
      />
      {application && <ProfileMediaEditor />}
      {application && <PublicLocationEditor />}
      {application && <ConsultationPreference />}
      {application && (
        <CredentialEvidenceEditor profileVersion={application.version} />
      )}
    </>
  );
}
