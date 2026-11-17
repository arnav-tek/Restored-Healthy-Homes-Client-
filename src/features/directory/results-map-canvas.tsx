"use client";
import { useEffect, useRef, useState } from "react";
import type { ResultMapPoint } from "@/data/locations/directory";
import { profileHref } from "@/validation/profile";
import { groupMapMarkers } from "@/domain/map-markers";
import "maplibre-gl/dist/maplibre-gl.css";
export default function ResultsMapCanvas({
  points,
  returnTo,
}: {
  points: ResultMapPoint[];
  returnTo: string;
}) {
  const container = useRef<HTMLDivElement>(null),
    [state, setState] = useState<"loading" | "ready" | "failed">("loading"),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false,
      map: import("maplibre-gl").Map | undefined;
    const timer = setTimeout(() => {
      if (!cancelled) setState("failed");
    }, 15000);
    import("maplibre-gl")
      .then((gl) => {
        if (cancelled || !container.current) return;
        gl.setWorkerUrl("/api/map-worker");
        map = new gl.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [points[0].location.longitude, points[0].location.latitude],
          zoom: 7,
          cooperativeGestures: true,
          attributionControl: { compact: false },
        });
        map.scrollZoom.disable();
        map.addControl(new gl.NavigationControl({ showCompass: false }));
        map.on("load", () => {
          clearTimeout(timer);
          if (!cancelled) setState("ready");
        });
        map.on("error", () => {
          clearTimeout(timer);
          if (!cancelled) setState("failed");
        });
        const bounds = new gl.LngLatBounds();
        for (const p of points)
          bounds.extend([p.location.longitude, p.location.latitude]);
        if (points.length > 1)
          map.fitBounds(bounds, { padding: 45, maxZoom: 10, duration: 0 });
        const markers: import("maplibre-gl").Marker[] = [];
        function drawMarkers() {
          if (!map) return;
          markers.splice(0).forEach((marker) => marker.remove());
          const groups = groupMapMarkers(points, (coordinate) =>
            map!.project(coordinate),
          );
          for (const group of groups) {
            const first = group[0];
            const coord: [number, number] = [
              first.location.longitude,
              first.location.latitude,
            ];
            const marker = document.createElement("button");
            marker.type = "button";
            marker.className = "results-map-marker";
            marker.textContent = group.length > 1 ? String(group.length) : "●";
            marker.setAttribute(
              "aria-label",
              group.length > 1
                ? `${group.length} professionals in this map area`
                : first.businessName,
            );
            const body = document.createElement("div");
            body.className = "results-map-popup";
            for (const p of group) {
              const section = document.createElement("section"),
                title = document.createElement("strong"),
                summary = document.createElement("p"),
                link = document.createElement("a");
              title.textContent = p.businessName;
              summary.textContent = `${p.location.label} · ${p.summary.slice(0, 180)}`;
              link.textContent = "View profile";
              link.href = profileHref(p.id, returnTo);
              section.append(title, summary, link);
              body.append(section);
            }
            const popup = new gl.Popup({
              offset: 18,
              focusAfterOpen: true,
            }).setDOMContent(body);
            const placed = new gl.Marker({ element: marker })
              .setLngLat(coord)
              .setPopup(popup)
              .addTo(map);
            markers.push(placed);
            marker.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                placed.togglePopup();
              }
            });
          }
        }
        drawMarkers();
        map.on("moveend", drawMarkers);
        map.on("resize", drawMarkers);
      })
      .catch(() => {
        clearTimeout(timer);
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      map?.remove();
    };
  }, [points, returnTo, attempt]);
  return (
    <div className="results-map-panel">
      {state === "loading" && <p role="status">Loading map…</p>}
      {state === "failed" && (
        <div className="notice" role="status">
          <p>The map is unavailable. Search and the results list still work.</p>
          <button
            className="text-link"
            type="button"
            onClick={() => {
              setState("loading");
              setAttempt((n) => n + 1);
            }}
          >
            Retry map
          </button>
        </div>
      )}
      <div
        ref={container}
        className="results-map-canvas"
        aria-label="Interactive map of this results page"
        style={state === "failed" ? { display: "none" } : undefined}
      />
      <small>
        <a href="https://openfreemap.org/">OpenFreeMap</a> ·{" "}
        <a href="https://openmaptiles.org/">© OpenMapTiles</a> ·{" "}
        <a href="https://www.openstreetmap.org/copyright">
          © OpenStreetMap contributors
        </a>
      </small>
    </div>
  );
}
