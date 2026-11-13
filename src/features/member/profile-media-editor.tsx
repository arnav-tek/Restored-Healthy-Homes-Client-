"use client";
import { useEffect, useState, useRef } from "react";
import { ProfileImage } from "@/features/profiles/profile-image";
import { parseMediaState } from "@/validation/profile-media";
import { isRecord } from "@/validation/member-account";
import {
  mediaUuid,
  profileImageInputLimit,
  profileImageTypes,
  type ProfileMediaState,
} from "@/domain/profile-media";
export function ProfileMediaEditor() {
  const [saved, setSaved] = useState<ProfileMediaState | null>(null),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [draftId, setDraftId] = useState<string | null>(null),
    [remove, setRemove] = useState(false),
    [published, setPublished] = useState(false),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null),
    feedback = useRef<HTMLParagraphElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function load() {
    setBusy(true);
    setFailure("");
    try {
      const r = await fetch("/api/member/profile-media", { cache: "no-store" });
      const raw: unknown = await r.json();
      const data = r.ok ? parseMediaState(raw) : null;
      if (!data)
        throw new Error(
          "Saved image is unavailable. Your draft has not been discarded.",
        );
      setSaved(data);
      if (!file && !draftId && !remove) setPublished(data.published);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Image status unavailable.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let current = true;
    fetch("/api/member/profile-media", { cache: "no-store" })
      .then(async (r) => {
        const data = r.ok ? parseMediaState(await r.json()) : null;
        if (!current) return;
        if (data) {
          setSaved(data);
          setPublished(data.published);
        } else
          setFailure(
            "Image status unavailable. Reload saved image status to try again.",
          );
      })
      .catch(() => {
        if (current)
          setFailure(
            "Image status unavailable. Reload saved image status to try again.",
          );
      });
    return () => {
      current = false;
    };
  }, []);
  async function save() {
    if (!saved || busy) return;
    setBusy(true);
    setFailure("");
    setNotice("");
    let target = remove ? null : (draftId ?? saved.photoId);
    try {
      if (file && !draftId && !remove) {
        const r = await fetch("/api/member/profile-media", {
          method: "POST",
          headers: { "content-type": file.type },
          body: file,
        });
        const raw: unknown = await r.json();
        if (
          !r.ok ||
          !isRecord(raw) ||
          typeof raw.draftId !== "string" ||
          !mediaUuid.test(raw.draftId)
        )
          throw new Error(
            isRecord(raw) && typeof raw.error === "string"
              ? raw.error
              : "Upload could not be confirmed.",
          );
        target = raw.draftId;
        setDraftId(target);
      }
      const r = await fetch("/api/member/profile-media", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target,
          version: saved.version,
          published: target ? published : false,
        }),
      });
      const raw: unknown = await r.json(),
        data = r.ok ? parseMediaState(raw) : null;
      if (!data || !isRecord(raw) || raw.saved !== true)
        throw new Error(
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "Save could not be confirmed. Reload saved image status before retrying.",
        );
      setSaved(data);
      setFile(null);
      setPreview(null);
      setDraftId(null);
      setRemove(false);
      setPublished(data.published);
      if (input.current) input.current.value = "";
      setNotice(
        "Profile image saved. Public display requires your publication choice and an eligible listing. Detached files stay private and are cleaned after a safety delay.",
      );
    } catch (e) {
      setFailure(
        e instanceof Error
          ? e.message
          : "Image save could not be confirmed. Your draft is retained.",
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
      const r = await fetch("/api/member/profile-media", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: id }),
      });
      const raw: unknown = await r.json(),
        data = r.ok ? parseMediaState(raw) : null;
      if (!data)
        throw new Error(
          "Discard could not be confirmed. Reload saved image status before retrying.",
        );
      setSaved(data);
      if (id === draftId) {
        setFile(null);
        setPreview(null);
        setDraftId(null);
        setRemove(false);
        setPublished(data.published);
        if (input.current) input.current.value = "";
      }
      setNotice(
        "Draft discarded. Saved image unchanged. Private file cleanup may finish on a later account visit.",
      );
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Discard failed.");
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    if (draftId) {
      void discard(draftId);
      return;
    }
    setFile(null);
    setPreview(null);
    setRemove(false);
    setPublished(saved?.published ?? false);
    setFailure("");
    if (input.current) input.current.value = "";
  }
  const shown = remove
    ? null
    : (preview ??
      (draftId
        ? `/api/member/profile-media?image=${draftId}`
        : saved?.photoId
          ? `/api/member/profile-media?image=${saved.photoId}`
          : null));
  return (
    <section
      className="section min-w-0"
      aria-labelledby="profile-image-heading"
    >
      <h2 id="profile-image-heading">Profile photo or logo</h2>
      <p className="field-help">
        JPEG, PNG or WebP up to 5 MB and 16 million pixels. Images are resized
        and metadata is removed. Selecting a file does not replace your saved
        image. Save this image separately from your text details.
      </p>
      <ProfileImage
        src={shown}
        alt="Your profile image preview"
        className="profile-photo-placeholder"
        style={{ width: "100%", maxWidth: 320, height: 240 }}
      />
      <fieldset
        disabled={busy}
        className="member-form-fields min-w-0"
        style={{ gridTemplateColumns: "minmax(0,1fr)" }}
      >
        <legend className="sr-only">Profile image controls</legend>
        <label htmlFor="profile-image-file">
          Choose a profile photo or logo
        </label>
        <input
          ref={input}
          id="profile-image-file"
          type="file"
          style={{ maxWidth: "100%", minWidth: 0, width: "100%" }}
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="image-feedback"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (!chosen) return;
            if (draftId) {
              setFailure(
                "Discard or save the uploaded draft before choosing another image.",
              );
              e.target.value = "";
              return;
            }
            if (
              chosen.size > profileImageInputLimit ||
              !profileImageTypes.some((t) => t === chosen.type)
            ) {
              setFailure("Choose a JPEG, PNG or WebP image up to 5 MB.");
              e.target.value = "";
              return;
            }
            setFile(chosen);
            setPreview(URL.createObjectURL(chosen));
            setRemove(false);
            setPublished(false);
            setFailure("");
          }}
        />
        <label>
          <input
            type="checkbox"
            checked={published}
            disabled={remove || !shown}
            onChange={(e) => setPublished(e.target.checked)}
          />{" "}
          Publish this image when my listing is eligible
        </label>
        <p className="field-help">
          Unpublished images stay private. Hiding a listing stops new public
          image requests; copies already downloaded cannot be recalled.
        </p>
        <div className="admin-inline-actions">
          <button
            className="button"
            type="button"
            disabled={!saved}
            onClick={save}
          >
            {busy ? "Saving…" : "Save profile image"}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={cancel}
          >
            Cancel image changes
          </button>
          {saved?.photoId && (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setRemove(true);
                setPublished(false);
                setNotice(
                  "Removal is selected. Save profile image to confirm.",
                );
              }}
            >
              Remove saved image
            </button>
          )}
          <button className="text-link" type="button" onClick={load}>
            Reload saved image status
          </button>
        </div>
        {saved?.drafts.length ? (
          <div>
            <h3>Unused uploaded drafts</h3>
            <p>
              Up to four retained files and 20 upload attempts per day. Cleanup
              has a ten-minute safety delay; abandoned drafts expire after 24
              hours and are cleaned on later account requests.
            </p>
            <ul>
              {saved.drafts.map((id, index) => (
                <li key={id}>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      if (file || draftId) {
                        setFailure("Cancel the current image draft first.");
                        return;
                      }
                      setDraftId(id);
                      setPublished(false);
                      setRemove(false);
                    }}
                  >
                    Use draft {index + 1}
                  </button>
                  {" · "}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => discard(id)}
                  >
                    Discard draft {index + 1}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </fieldset>
      <p
        ref={feedback}
        id="image-feedback"
        tabIndex={-1}
        role={failure ? "alert" : "status"}
        className={failure ? "field-error" : "field-help"}
      >
        {failure || notice}
      </p>
    </section>
  );
}
