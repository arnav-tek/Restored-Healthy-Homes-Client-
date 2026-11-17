"use client";
import "../consultations/connected-consultations.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { parseConsultationPreference } from "@/validation/connected-consultations";
const endpoint = "/api/member/consultation-preference";
type Preference = { enabled: boolean; version: number };
async function readSaved(): Promise<Preference> {
  const response = await fetch(endpoint, { cache: "no-store" });
  const data: unknown = await response.json();
  const parsed = parseConsultationPreference(data);
  if (!response.ok || !parsed)
    throw Error(
      "Saved participation could not be loaded. Your choice remains here.",
    );
  return parsed;
}
function Editor({ initial }: { initial: Preference }) {
  const ready = useDemoReady();
  const [saved, setSaved] = useState(initial),
    [enabled, setEnabled] = useState(initial.enabled),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function reload() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const value = await readSaved();
      setSaved(value);
      setMessage(
        `Saved participation is ${value.enabled ? "on" : "off"} (version ${value.version}). Your choice is retained; compare before saving.`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Saved participation is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel connected-consultations consultation-preference"
      aria-labelledby="consultation-participation-heading"
    >
      <h2 id="consultation-participation-heading">
        Consultation participation
      </h2>
      <p>
        Offer free phone consultations when your listing is approved, active,
        unsuspended and in the requested category. Acceptance starts
        coordination; it does not book a call.
      </p>
      <form
        method="post"
        action={endpoint}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready || busy) return;
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const response = await fetch(endpoint, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ enabled, version: saved.version }),
            });
            const data = await response.json();
            if (!response.ok)
              throw Error(
                data.error ??
                  "Participation could not be saved. Your choice is retained.",
              );
            const value = parseConsultationPreference({
              enabled: data.enabled,
              version: data.version,
            });
            if (data.saved !== true || !value)
              throw Error(
                "Saving could not be confirmed. Your choice is retained.",
              );
            setSaved(value);
            setMessage(
              "Consultation participation saved. Reload your profile before editing other details.",
            );
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Saving failed. Your choice is retained.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!ready || busy}>
          <label className="showcase-checkbox">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Offer free phone consultations
          </label>
          <button className="button" type="submit">
            {busy ? "Saving…" : "Save consultation participation"}
          </button>
        </fieldset>
      </form>
      <p>
        Saved preference:{" "}
        {saved.enabled
          ? "Offering free phone consultations"
          : "Not offering free phone consultations"}{" "}
        · Profile version {saved.version}
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <Link href="/member/profile" target="_blank" rel="noopener">
        Compare saved profile in another tab
      </Link>{" "}
      <button
        type="button"
        className="text-link"
        disabled={busy}
        onClick={() => void reload()}
      >
        Reload saved version, keep participation choice
      </button>
    </section>
  );
}
export function ConsultationPreference() {
  const [initial, setInitial] = useState<Preference | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    readSaved()
      .then((value) => {
        if (active) setInitial(value);
      })
      .catch(() => {
        if (active)
          setError("Consultation participation is temporarily unavailable.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return initial ? (
    <Editor initial={initial} />
  ) : (
    <section className="panel">
      <p role={error ? "alert" : "status"}>
        {error || "Loading consultation participation…"}
      </p>
      {error && (
        <button
          type="button"
          onClick={() => {
            setError("");
            setAttempt((v) => v + 1);
          }}
        >
          Retry loading participation
        </button>
      )}
    </section>
  );
}
