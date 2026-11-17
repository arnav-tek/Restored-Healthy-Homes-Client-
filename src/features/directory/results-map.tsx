"use client";
import { useState } from "react";
import type { ResultMapPoint } from "@/data/locations/directory";
export function ResultsMap({
  points,
  returnTo,
}: {
  points: ResultMapPoint[];
  returnTo: string;
}) {
  const [show, setShow] = useState(false);
  const [MapCanvas, setCanvas] = useState<
    typeof import("./results-map-canvas").default | null
  >(null);
  const [failed, setFailed] = useState(false);
  async function loadMap() {
    setFailed(false);
    try {
      const loaded = await import("./results-map-canvas");
      setCanvas(() => loaded.default);
    } catch {
      setFailed(true);
    }
  }
  return (
    <section className="results-map-section" aria-label="Results map">
      <button
        type="button"
        className="button button-secondary"
        aria-expanded={show}
        aria-controls="results-map-content"
        onClick={() => {
          if (!show && points.length && !MapCanvas) void loadMap();
          setShow((s) => !s);
        }}
      >
        {show ? "Hide map" : "Show map"}
      </button>
      {show && (
        <div id="results-map-content">
          <p className="field-help">
            Approximate public city/ZIP centers for this results page only.
            Nearby locations do not establish service coverage. The complete
            results list remains below.
          </p>
          {points.length ? (
            MapCanvas ? (
              <MapCanvas points={points} returnTo={returnTo} />
            ) : failed ? (
              <div className="notice" role="status">
                <p>
                  The map could not load. Search and the results list still
                  work.
                </p>
                <button className="text-link" type="button" onClick={loadMap}>
                  Retry map
                </button>
              </div>
            ) : (
              <p role="status">Loading map…</p>
            )
          ) : (
            <p role="status">No saved map locations on this results page.</p>
          )}
        </div>
      )}
    </section>
  );
}
