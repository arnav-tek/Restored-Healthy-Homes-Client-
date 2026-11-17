"use client";
import { useId, useState } from "react";
import {
  parseSearchLocation,
  type SearchLocation,
} from "@/domain/connected-location";
export function useLocationChoice(
  initial: SearchLocation | null = null,
  initialText = "",
) {
  const [selected, setSelected] = useState(initial),
    [text, setText] = useState(initial?.label ?? initialText);
  const [candidates, setCandidates] = useState<SearchLocation[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function resolve() {
    setBusy(true);
    setError("");
    setCandidates([]);
    try {
      const r = await fetch("/api/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text }),
        cache: "no-store",
      });
      const raw = await r.json();
      if (!r.ok)
        throw Error(
          typeof raw.error === "string"
            ? raw.error
            : "Location lookup is unavailable.",
        );
      if (!Array.isArray(raw.places))
        throw Error("Location lookup is unavailable.");
      const parsed = raw.places.map(parseSearchLocation);
      if (parsed.some((p: SearchLocation | null) => !p))
        throw Error("Location lookup is unavailable.");
      setCandidates(parsed);
      if (!parsed.length)
        setError(
          "No matching US city or ZIP was found. Check the spelling or add a state abbreviation.",
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Location lookup is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return {
    text,
    selected,
    candidates,
    error,
    busy,
    resolve,
    change(value: string) {
      setText(value);
      setSelected(null);
      setCandidates([]);
      setError("");
    },
    choose(p: SearchLocation) {
      setSelected(p);
      setText(p.label);
      setCandidates([]);
      setError("");
    },
  };
}
export function LocationChoice({
  choice,
}: {
  choice: ReturnType<typeof useLocationChoice>;
}) {
  const id = useId();
  return (
    <div className="search-field location-choice">
      <label htmlFor={id}>City or ZIP code</label>
      <input
        id={id}
        name="location"
        type="text"
        value={choice.text}
        onChange={(e) => choice.change(e.target.value)}
        maxLength={80}
        placeholder="City, ST or 00501"
        autoComplete="off"
        aria-describedby={id + "-help"}
        aria-invalid={!!choice.error}
      />
      <input type="hidden" name="place" value={choice.selected?.id ?? ""} />
      <p id={id + "-help"} className="field-help">
        US city/ZIP centers are approximate. Distance is from a listed location,
        not service coverage.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="text-link"
          type="button"
          onClick={choice.resolve}
          disabled={choice.busy || !choice.text.trim()}
        >
          {choice.busy ? "Finding locations…" : "Find city or ZIP"}
        </button>
        {choice.text && (
          <button
            className="text-link"
            type="button"
            onClick={() => choice.change("")}
          >
            Clear location
          </button>
        )}
      </div>
      {choice.error && (
        <p role="alert" className="field-error">
          {choice.error}
        </p>
      )}
      {choice.candidates.length > 0 && (
        <fieldset className="location-candidates">
          <legend>Choose the intended location</legend>
          {choice.candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              className="button button-secondary"
              onClick={() => choice.choose(p)}
            >
              {p.label} · {p.kind === "postcode" ? "ZIP center" : "City center"}
            </button>
          ))}
        </fieldset>
      )}
      {choice.selected && (
        <p role="status" className="field-help">
          Selected: {choice.selected.label}
        </p>
      )}
      <small>
        <a href="https://www.geoapify.com/">Powered by Geoapify</a> ·{" "}
        <a href="https://www.openstreetmap.org/copyright">
          © OpenStreetMap contributors
        </a>
      </small>
    </div>
  );
}
