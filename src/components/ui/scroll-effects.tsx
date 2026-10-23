"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/components/ui/use-reduced-motion";

const selector = "[data-scroll-reveal]";

/** Opt-in motion only: server-rendered content never depends on animation to show. */
export function ScrollEffects() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (
      pathname.startsWith("/demo/") ||
      pathname.startsWith("/admin/") ||
      pathname === "/login"
    )
      return;
    const root = document.getElementById("main");
    if (!root || reducedMotion || typeof IntersectionObserver === "undefined")
      return;

    const active = new Map<HTMLElement, Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        const groups = new Map<Element, number>();
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          if (element.dataset.revealed || !root.contains(element)) continue;
          element.dataset.revealed = "true";
          // Keyboard and pointer interactions should never chase a moving target.
          if (
            element.contains(document.activeElement) ||
            typeof element.animate !== "function"
          )
            continue;

          const group = element.closest("[data-scroll-stagger]");
          const order = group ? (groups.get(group) ?? 0) : 0;
          if (group) groups.set(group, order + 1);
          const image = element.dataset.scrollReveal === "scale";
          const animation = element.animate(
            [
              { translate: "0 24px", ...(image ? { scale: "0.97" } : {}) },
              { translate: "0 0", ...(image ? { scale: "1" } : {}) },
            ],
            {
              duration: image ? 760 : 660,
              delay: Math.min(order, 3) * 64,
              fill: "backwards",
              easing: "cubic-bezier(.22,1,.36,1)",
            },
          );
          active.set(element, animation);
          const forget = () => active.delete(element);
          animation.onfinish = forget;
          animation.oncancel = forget;
        }
      },
      { rootMargin: "0px 0px -32px 0px", threshold: 0.08 },
    );

    function visit(node: Node, callback: (element: HTMLElement) => void) {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(selector)) callback(node);
      node.querySelectorAll<HTMLElement>(selector).forEach(callback);
    }
    function observe(element: HTMLElement) {
      if (!element.dataset.revealed) observer.observe(element);
    }
    visit(root, observe);

    // Client navigation, filters and tab-only public records can insert new cards.
    const mutations =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver((records) => {
            for (const record of records) {
              record.removedNodes.forEach((node) =>
                visit(node, (element) => {
                  observer.unobserve(element);
                  active.get(element)?.cancel();
                }),
              );
              record.addedNodes.forEach((node) => visit(node, observe));
            }
          });
    mutations?.observe(root, { childList: true, subtree: true });

    function stopForInteraction(event: Event) {
      if (!(event.target instanceof Node)) return;
      for (const [element, animation] of active) {
        if (element.contains(event.target)) animation.cancel();
      }
    }
    root.addEventListener("focusin", stopForInteraction);
    root.addEventListener("pointerdown", stopForInteraction);
    return () => {
      observer.disconnect();
      mutations?.disconnect();
      root.removeEventListener("focusin", stopForInteraction);
      root.removeEventListener("pointerdown", stopForInteraction);
      active.forEach((animation) => animation.cancel());
    };
  }, [pathname, reducedMotion]);

  return null;
}
