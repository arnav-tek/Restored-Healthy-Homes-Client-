"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDemoDraft, useDemoSession } from "./demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { validSamplePhoto } from "@/validation/sample-photo";

export function ShowcasePreferences({ memberId }: { memberId: string }) {
  const { state, dispatch, resetVersion } = useDemoSession();
  const { draft, saveDraft, clearDraft } = useDemoDraft(`photo:${memberId}`);
  const ready = useDemoReady();
  const [error, setError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [resetVersion, memberId],
  );
  const record = state.records.find((item) => item.id === memberId);
  if (!record) return null;
  const canEdit =
    ready &&
    state.identity?.kind === "member" &&
    state.identity.memberId === memberId;
  const photo = typeof draft?.photo === "string" ? draft.photo : "";
  return (
    <section
      className="panel showcase-preferences"
      aria-labelledby="showcase-preferences-heading"
    >
      <div>
        <h2 id="showcase-preferences-heading">Consultation participation</h2>
        <label className="showcase-checkbox">
          <input
            type="checkbox"
            checked={record.freeConsultation === true}
            disabled={!canEdit}
            onChange={(event) =>
              dispatch({
                type: "set-free-consultation",
                id: memberId,
                enabled: event.target.checked,
              })
            }
          />
          I offer a free phone consultation
        </label>
        <p className="field-help">
          Local preference only. Matching also requires approval, active
          membership and an unsuspended listing. No appointment or email is
          created.
        </p>
      </div>
      <div>
        <h2>Business photo preview</h2>
        <label htmlFor="sample-business-photo">
          Choose a sample business photo
        </label>
        <input
          ref={photoInput}
          id="sample-business-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={!canEdit}
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            const version = ++generation.current;
            if (!file) return;
            setError("");
            try {
              if (
                !validSamplePhoto(
                  file.type,
                  file.size,
                  new Uint8Array(await file.slice(0, 12).arrayBuffer()),
                )
              )
                throw new Error("Choose a JPEG, PNG or WebP image up to 3 MB.");
              const bitmap = await createImageBitmap(file);
              const valid =
                bitmap.width > 0 &&
                bitmap.height > 0 &&
                bitmap.width <= 4096 &&
                bitmap.height <= 4096;
              bitmap.close();
              if (!valid)
                throw new Error(
                  "Use an image no larger than 4096 × 4096 pixels.",
                );
              const reader = new FileReader();
              reader.onload = () => {
                if (
                  version === generation.current &&
                  typeof reader.result === "string"
                )
                  saveDraft({ photo: reader.result });
              };
              reader.onerror = () => {
                if (version === generation.current)
                  setError("The sample photo could not be opened.");
              };
              reader.readAsDataURL(file);
            } catch (cause) {
              if (version === generation.current)
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "The sample image could not be opened.",
                );
            }
          }}
          aria-describedby="sample-photo-help sample-photo-error"
        />
        <p id="sample-photo-help" className="field-help">
          Use a sample image. Preview only: nothing is uploaded or added to the
          public directory. Refresh, sign-out and reset clear it.
        </p>
        <p id="sample-photo-error" role="alert" className="field-error">
          {error}
        </p>
        {photo && (
          <>
            <Image
              src={photo}
              unoptimized
              width={280}
              height={180}
              alt="Local business photo preview"
              className="sample-business-photo"
            />
            <button
              className="text-link"
              type="button"
              onClick={() => {
                generation.current++;
                clearDraft();
                setError("");
                if (photoInput.current) {
                  photoInput.current.value = "";
                  photoInput.current.focus();
                }
              }}
            >
              Remove sample photo
            </button>
          </>
        )}
      </div>
    </section>
  );
}
