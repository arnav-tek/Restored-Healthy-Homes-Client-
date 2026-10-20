"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/components/ui/use-reduced-motion";

/** Content is visible by default; motion progressively enhances three story sections. */
export function ScrollEffects({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (
      reducedMotion ||
      !root.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          if (element.dataset.revealed) continue;
          element.dataset.revealed = "true";
          if (typeof element.animate !== "function") continue;
          const animation = element.animate(
            [{ transform: "translateY(16px)" }, { transform: "translateY(0)" }],
            { duration: 550, easing: "cubic-bezier(.2,.7,.3,1)" },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    root.current
      .querySelectorAll("[data-scroll-reveal]")
      .forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [reducedMotion]);
  return (
    <div ref={root} className="homepage-sections">
      {children}
    </div>
  );
}
