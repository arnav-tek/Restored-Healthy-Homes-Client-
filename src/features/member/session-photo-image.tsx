"use client";
import { useEffect, useRef } from "react";
import type { SessionPhoto } from "@/validation/sample-photo";

// Object URLs expose no encoded image bytes in navigation or server HTML.
// The resource exists only while its preview is mounted.
export function SessionPhotoImage({
  photo,
  alt,
  className,
}: {
  photo: SessionPhoto;
  alt: string;
  className: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const [header, encoded] = photo.dataUrl.split(",");
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(
      new Blob([bytes], { type: header.slice(5).split(";")[0] }),
    );
    // This DOM resource is entirely local; it must bypass image optimization.
    const image = document.createElement("img");
    image.src = url;
    image.alt = alt;
    image.width = photo.width;
    image.height = photo.height;
    image.className = className;
    host.current?.replaceChildren(image);
    return () => {
      image.remove();
      URL.revokeObjectURL(url);
    };
  }, [photo.dataUrl, photo.width, photo.height, alt, className]);
  return <div ref={host} className="session-photo-host" />;
}
