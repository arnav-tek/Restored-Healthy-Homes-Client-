"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { useReducedMotion } from "@/components/ui/use-reduced-motion";
import { showcaseMedia } from "@/data/content/showcase-media";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wantsPlayback = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const reducedMotion = useReducedMotion();
  const ready = useDemoReady();
  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.getAttribute("src")) video.src = showcaseMedia.video;
    void video.play().catch(() => setPlaying(false));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection;
    let inView = true;
    function syncPlayback() {
      if (!video) return;
      if (
        reducedMotion ||
        connection?.saveData ||
        document.hidden ||
        !inView ||
        !wantsPlayback.current ||
        unavailable
      )
        video.pause();
      else play();
    }
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            syncPlayback();
          });
    observer?.observe(video.closest(".home-hero") ?? video);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [play, reducedMotion, unavailable]);

  return (
    <>
      <div className="hero-video-backdrop" aria-hidden="true">
        <Image src={showcaseMedia.poster} alt="" fill preload sizes="100vw" />
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={showcaseMedia.poster}
          tabIndex={-1}
          className={playing && !unavailable ? "is-playing" : ""}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setUnavailable(true);
            setPlaying(false);
          }}
        />
      </div>
      <div className="hero-video-controls">
        <span>{showcaseMedia.label}</span>
        <button
          type="button"
          className="hero-video-toggle"
          disabled={!ready || unavailable}
          aria-label={
            playing ? "Pause background video" : "Play background video"
          }
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) {
              wantsPlayback.current = true;
              play();
            } else {
              wantsPlayback.current = false;
              video.pause();
            }
          }}
        >
          {playing ? (
            <Pause size={14} aria-hidden="true" />
          ) : (
            <Play size={14} aria-hidden="true" />
          )}
          {playing ? "Pause video" : "Play video"}
        </button>
        {unavailable && (
          <span role="status">Video unavailable. Still image shown.</span>
        )}
        {!ready && (
          <span>Still image shown. JavaScript enables video controls.</span>
        )}
      </div>
    </>
  );
}
