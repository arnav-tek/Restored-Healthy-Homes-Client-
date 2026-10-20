"use client";
import { useState } from "react";
import { useDemoReady } from "@/components/ui/use-demo-ready";

export function CityMap({ location }: { location: string }) {
  const ready = useDemoReady();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = `https://www.google.com/maps?${new URLSearchParams({ q: location, z: "11", output: "embed" })}`;
  return (
    <div className="city-map">
      <button
        type="button"
        className="text-link city-map-toggle"
        disabled={!ready}
        aria-expanded={open}
        aria-controls="business-city-map"
        onClick={() => {
          setOpen(!open);
          setFailed(false);
        }}
      >
        {open ? "Hide city map" : "Show city map"}
      </button>
      <div id="business-city-map" hidden={!open}>
        {open && (
          <>
            <p className="field-help">
              Google Maps city preview. This is not an exact business address.
              If the map is unavailable, use the Google Maps link above.
            </p>
            {!failed && (
              <iframe
                title={`Google Maps city preview for ${location}`}
                src={src}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
              />
            )}
            {failed && (
              <p role="status">
                The city map could not load. Use the Google Maps link above.
              </p>
            )}
          </>
        )}
      </div>
      {!ready && <span>Use the Google Maps link above to view this city.</span>}
    </div>
  );
}
