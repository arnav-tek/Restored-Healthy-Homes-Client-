"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  MemberCredentials,
  MemberCredential,
} from "@/domain/credential-review";
import {
  parseMemberCredentials,
  credentialId,
} from "@/validation/credential-review";
import { isRecord } from "@/validation/member-account";
import {
  profileImageTypes,
  profileImageInputLimit,
} from "@/domain/profile-media";
import { ProfileImage } from "@/features/profiles/profile-image";
function EvidenceClaim({
  claim,
  onChanged,
}: {
  claim: MemberCredential;
  onChanged: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [draftId, setDraftId] = useState<string | null>(null),
    [remove, setRemove] = useState(false),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [notice, setNotice] = useState("");
  const control = useRef<HTMLInputElement>(null),
    feedback = useRef<HTMLParagraphElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function clear() {
    setFile(null);
    setPreview(null);
    setDraftId(null);
    setRemove(false);
    if (control.current) control.current.value = "";
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setFailure("");
    setNotice("");
    let target = remove ? null : (draftId ?? claim.evidenceId);
    try {
      if (file && !draftId && !remove) {
        const r = await fetch(`/api/member/credentials?claim=${claim.id}`, {
          method: "POST",
          headers: { "content-type": file.type },
          body: file,
        });
        const raw: unknown = await r.json();
        if (!r.ok || !isRecord(raw) || !credentialId(raw.draftId))
          throw new Error(
            isRecord(raw) && typeof raw.error === "string"
              ? raw.error
              : "Upload could not be confirmed.",
          );
        target = raw.draftId;
        setDraftId(target);
      }
      const r = await fetch("/api/member/credentials", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          target,
          version: claim.version,
        }),
      });
      const raw: unknown = await r.json();
      if (
        !r.ok ||
        !isRecord(raw) ||
        raw.saved !== true ||
        !parseMemberCredentials(raw)
      )
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Save could not be confirmed. Reload before retrying.",
        );
      clear();
      setNotice(
        "Evidence saved. Changes require a new review. Earlier submitted evidence is retained privately for audit.",
      );
      await onChanged();
    } catch (e) {
      setFailure(
        e instanceof Error
          ? e.message
          : "Evidence save could not be confirmed. Your draft is retained.",
      );
    } finally {
      setBusy(false);
      requestAnimationFrame(() => feedback.current?.focus());
    }
  }
  async function discard(id: string) {
    setBusy(true);
    setFailure("");
    try {
      const r = await fetch("/api/member/credentials", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: id }),
      });
      const raw: unknown = await r.json();
      if (!r.ok || !parseMemberCredentials(raw))
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Discard could not be confirmed.",
        );
      if (id === draftId) clear();
      setNotice(
        "Unattached draft discarded. Cleanup may finish on a later visit after the safety delay.",
      );
      await onChanged();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Discard failed.");
    } finally {
      setBusy(false);
    }
  }
  const shown = remove
    ? null
    : (preview ??
      (draftId
        ? `/api/member/credentials?file=${draftId}`
        : claim.evidenceId
          ? `/api/member/credentials?file=${claim.evidenceId}`
          : null));
  return (
    <article className="panel min-w-0 [overflow-wrap:anywhere]">
      <h3>{claim.name}</h3>
      <p>
        Review status:{" "}
        <strong>
          {claim.state === "verified"
            ? "Reviewed credential"
            : claim.state === "pending"
              ? "Submitted claim · review pending"
              : claim.state === "rejected"
                ? "Not verified · rejected"
                : "Not verified · revoked"}
        </strong>
      </p>
      <p className="field-help">
        Evidence is private. Replacing or removing saved evidence clears the
        reviewed badge and requires another review. No qualification or expiry
        is inferred from the upload.
      </p>
      <ProfileImage
        src={shown}
        alt={`Private evidence preview for ${claim.name}`}
        className="profile-photo-placeholder"
        style={{ maxWidth: 320, width: "100%", height: 240 }}
      />
      <fieldset
        disabled={busy}
        className="member-form-fields min-w-0"
        style={{ gridTemplateColumns: "minmax(0,1fr)" }}
      >
        <legend className="sr-only">Evidence for {claim.name}</legend>
        <label htmlFor={`evidence-${claim.id}`}>
          Choose an evidence scan for {claim.name}
        </label>
        <input
          ref={control}
          id={`evidence-${claim.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ width: "100%", minWidth: 0, maxWidth: "100%" }}
          aria-describedby={`evidence-help-${claim.id}`}
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (!chosen) return;
            if (draftId) {
              setFailure(
                "Save or discard the uploaded draft before choosing another scan.",
              );
              e.target.value = "";
              return;
            }
            if (
              !profileImageTypes.some((t) => t === chosen.type) ||
              chosen.size > profileImageInputLimit
            ) {
              setFailure(
                "Choose a JPEG, PNG or WebP scan up to 5 MB. PDF is not supported.",
              );
              e.target.value = "";
              return;
            }
            setFile(chosen);
            setPreview(URL.createObjectURL(chosen));
            setRemove(false);
            setFailure("");
          }}
        />
        <p id={`evidence-help-${claim.id}`} className="field-help">
          JPEG/PNG/WebP only, up to 5 MB and 16 million pixels. Scans are
          resized to 1200 pixels and metadata removed. Selecting does not
          replace the saved evidence. PDF/original-document handling and
          retention duration await client policy.
        </p>
        <div className="admin-inline-actions">
          <button className="button" type="button" onClick={save}>
            {busy ? "Saving…" : "Save evidence"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              if (draftId) void discard(draftId);
              else clear();
            }}
          >
            Cancel evidence changes
          </button>
          {claim.evidenceId && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setRemove(true);
                setNotice(
                  "Removal selected. Save evidence to confirm and remove the reviewed badge. Audit copies remain private.",
                );
              }}
            >
              Remove current evidence
            </button>
          )}
        </div>
        {claim.drafts.length > 0 && (
          <div>
            <h4>Unused scan drafts</h4>
            <ul>
              {claim.drafts.map((id, index) => (
                <li key={id}>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => {
                      if (file || draftId) {
                        setFailure("Cancel the current draft first.");
                        return;
                      }
                      setDraftId(id);
                      setRemove(false);
                    }}
                  >
                    Use draft {index + 1}
                  </button>
                  {" · "}
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => discard(id)}
                  >
                    Discard draft {index + 1}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>
      <p
        ref={feedback}
        tabIndex={-1}
        role={failure ? "alert" : "status"}
        className={failure ? "field-error" : "field-help"}
      >
        {failure || notice}
      </p>
      {failure && (
        <Link href="/member/profile" target="_blank" rel="noopener">
          Compare saved credentials in another tab
        </Link>
      )}
    </article>
  );
}
export function CredentialEvidenceEditor({
  profileVersion,
}: {
  profileVersion: number;
}) {
  const [data, setData] = useState<MemberCredentials | null>(null),
    [failure, setFailure] = useState(""),
    [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    setFailure("");
    try {
      const r = await fetch("/api/member/credentials", { cache: "no-store" });
      const raw: unknown = await r.json(),
        parsed = r.ok ? parseMemberCredentials(raw) : null;
      if (!parsed)
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Saved credentials are unavailable. Your drafts are retained.",
        );
      setData(parsed);
    } catch (e) {
      setFailure(
        e instanceof Error ? e.message : "Credential status unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let current = true;
    fetch("/api/member/credentials", { cache: "no-store" })
      .then(async (r) => {
        const raw: unknown = await r.json();
        if (!current) return;
        const parsed = r.ok ? parseMemberCredentials(raw) : null;
        if (parsed) setData(parsed);
        else
          setFailure(
            "Saved credentials are unavailable. Try reloading their status.",
          );
      })
      .catch(() => {
        if (current) setFailure("Saved credentials are unavailable.");
      });
    return () => {
      current = false;
    };
  }, [profileVersion]);
  return (
    <section className="section" aria-labelledby="credential-evidence-heading">
      <h2 id="credential-evidence-heading">
        Credential claims and private evidence
      </h2>
      <p>
        Enter permitted credential claims in your profile and save the profile
        first. The platform does not issue certifications. Claims and uploads do
        not verify themselves, activate membership or grant featured placement.
      </p>
      <button
        type="button"
        className="text-link"
        onClick={load}
        disabled={loading}
      >
        {loading ? "Loading…" : "Reload credential status"}
      </button>
      {failure && (
        <p role="alert" className="field-error">
          {failure}
        </p>
      )}
      {data?.claims.length ? (
        <div className="grid gap-5 mt-4">
          {data.claims.map((c) => (
            <EvidenceClaim key={c.id} claim={c} onChanged={load} />
          ))}
        </div>
      ) : data ? (
        <p className="workspace-empty">
          No saved credential claims yet. Save a claim in your profile before
          uploading evidence.
        </p>
      ) : !failure ? (
        <p role="status">Loading saved credentials…</p>
      ) : null}
    </section>
  );
}
