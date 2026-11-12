"use client";
import { useEffect } from "react";
/** Revalidate on browser history restoration, tab focus and cross-tab logout.
 * Private content is hidden before checking, including BFCache restoration.
 */
export function SessionBoundary({
  identityId,
  admin = false,
}: {
  identityId?: string;
  admin?: boolean;
}) {
  useEffect(() => {
    const target = document.getElementById("private-account");
    let active = true;
    let revision = 0;
    async function check() {
      const requestRevision = ++revision;
      if (target) target.hidden = true;
      try {
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await r.json();
        if (!active || requestRevision !== revision) return;
        if (
          !r.ok ||
          !data.authenticated ||
          (identityId && data.identity?.id !== identityId)
        ) {
          window.location.replace("/login");
          return;
        }
        if (admin) {
          const authorization = await fetch("/api/admin/applications", {
            cache: "no-store",
          });
          if (!active || requestRevision !== revision) return;
          if (!authorization.ok) {
            window.location.replace("/admin");
            return;
          }
        }
        if (target) target.hidden = false;
      } catch {
        if (active && requestRevision === revision)
          window.location.replace("/login");
      }
    }
    function hide() {
      revision++;
      if (target) target.hidden = true;
    }
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("rhh-auth")
        : null;
    if (channel)
      channel.onmessage = () => {
        hide();
        window.location.replace("/login");
      };
    function visibility() {
      if (document.visibilityState === "hidden") hide();
      else void check();
    }
    window.addEventListener("pageshow", check);
    window.addEventListener("pagehide", hide);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", visibility);
    void check();
    return () => {
      active = false;
      channel?.close();
      window.removeEventListener("pageshow", check);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [identityId, admin]);
  return null;
}
