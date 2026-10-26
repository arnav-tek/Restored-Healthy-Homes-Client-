"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/ui/use-reduced-motion";
import { showcaseMedia } from "@/data/content/showcase-media";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const introComplete = useRef(false);
  const introTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const reducedMotion = useReducedMotion();
  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video || introComplete.current) return;
    // Set the native properties before attaching the source, including on Safari.
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    if (!video.getAttribute("src")) video.src = showcaseMedia.video;
    // A blocked or interrupted attempt leaves the poster visible. Media events
    // own frame visibility, so an older rejection cannot hide a newer frame.
    void video.play().catch(() => {});
  }, []);

  const finishIntro = useCallback(() => {
    introComplete.current = true;
    const video = videoRef.current;
    if (video) {
      video.autoplay = false;
      video.pause();
    }
  }, []);

  useEffect(() => () => {
    if (introTimer.current !== null) clearTimeout(introTimer.current);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection;
    const hero = video.closest(".home-hero") ?? video;
    const bounds = hero.getBoundingClientRect();
    let inView = bounds.bottom > 0 && bounds.top < window.innerHeight;
    function syncPlayback() {
      if (!video) return;
      if (
        reducedMotion ||
        connection?.saveData ||
        document.hidden ||
        !inView ||
        unavailable ||
        introComplete.current
      ) {
        video.autoplay = false;
        video.pause();
      } else play();
    }
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            syncPlayback();
          });
    observer?.observe(hero);
    document.addEventListener("visibilitychange", syncPlayback);
    window.addEventListener("pageshow", syncPlayback);
    syncPlayback();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      window.removeEventListener("pageshow", syncPlayback);
      video.autoplay = false;
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
          playsInline
          preload="none"
          tabIndex={-1}
          className={hasFrame && !unavailable ? "has-frame" : ""}
          onPlaying={() => {
            setHasFrame(true);
            // One bounded introduction; returning to the hero never restarts it.
            if (introTimer.current === null && !introComplete.current)
              introTimer.current = setTimeout(finishIntro, 4500);
          }}
          onEnded={finishIntro}
          onError={() => {
            setUnavailable(true);
          }}
        />
      </div>
      {unavailable && (
        <span className="sr-only" role="status">
          Video unavailable. Still image shown.
        </span>
      )}
    </>
  );
}
