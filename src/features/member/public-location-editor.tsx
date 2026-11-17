"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  parseSearchLocation,
  type SearchLocation,
} from "@/domain/connected-location";
import {
  LocationChoice,
  useLocationChoice,
} from "@/features/directory/location-choice";
function Editor({
  initial,
}: {
  initial: { version: number; location: SearchLocation | null };
}) {
  const choice = useLocationChoice(initial.location),
    [version, setVersion] = useState(initial.version),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function reloadVersion() {
    try {
      const r = await fetch("/api/member/location", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok || !Number.isSafeInteger(d.version)) throw Error();
      setVersion(d.version);
      setError("");
      setMessage(
        "Saved version reloaded. Your location choice is still here; compare before saving.",
      );
    } catch {
      setError("Saved version is unavailable. Your choice remains here.");
    }
  }
  return (
    <form
      className="section member-form-fields"
      onSubmit={async (e) => {
        e.preventDefault();
        if (choice.text.trim() && !choice.selected) {
          await choice.resolve();
          return;
        }
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const r = await fetch("/api/member/location", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              version,
              place: choice.selected?.id ?? null,
            }),
          });
          const d = await r.json();
          if (!r.ok) throw Error(d.error ?? "Location save failed.");
          if (d.saved !== true || !Number.isSafeInteger(d.version))
            throw Error("Save could not be confirmed.");
          setVersion(d.version);
          setMessage(
            "Public search location saved. Reload the profile before editing its other details.",
          );
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Location save failed. Your choice remains here.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Public search location</h2>
      <p>
        Choose an approximate city or ZIP center for distance search and map
        markers. This updates your public city/state, never a private street
        address. Nearby does not mean you serve that area.
      </p>
      <LocationChoice choice={choice} />
      <button type="submit" className="button" disabled={busy || choice.busy}>
        {busy ? "Saving…" : "Save public location"}
      </button>
      <p className="field-help">
        Clear the location and save to remove map coordinates. Your listing can
        still appear in ordinary searches.
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <Link href="/member/profile" target="_blank" rel="noopener">
        Compare saved profile in another tab
      </Link>
      <button
        type="button"
        className="text-link"
        onClick={reloadVersion}
        disabled={busy}
      >
        Reload saved version, keep location choice
      </button>
    </form>
  );
}
export function PublicLocationEditor() {
  const [initial, setInitial] = useState<{
      version: number;
      location: SearchLocation | null;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/member/location", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        const location =
          d.location === null ? null : parseSearchLocation(d.location);
        if (
          !r.ok ||
          !Number.isSafeInteger(d.version) ||
          (d.location !== null && !location)
        )
          throw Error();
        if (active) setInitial({ version: d.version, location });
      })
      .catch(() => {
        if (active)
          setError(
            "Public search location is temporarily unavailable. Your profile details can still be edited.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return initial ? (
    <Editor initial={initial} />
  ) : (
    <p role={error ? "alert" : "status"}>
      {error || "Loading public search location…"}
    </p>
  );
}
