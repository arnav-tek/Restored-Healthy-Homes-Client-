"use client";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
/** No image optimizer or signed URL: every request rechecks current visibility. */
export function ProfileImage({
  src,
  alt,
  className,
  style,
}: {
  src: string | null;
  alt: string;
  className: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div className={className} style={{ overflow: "hidden", ...style }}>
      {src && failed !== src ? (
        <Image
          unoptimized
          src={src}
          alt={alt}
          width={320}
          height={320}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onError={() => setFailed(src)}
        />
      ) : (
        <span>Profile image not available</span>
      )}
    </div>
  );
}
