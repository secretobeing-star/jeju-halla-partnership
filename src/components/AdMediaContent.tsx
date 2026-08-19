"use client";

import { useState } from "react";
import { getAdMediaKind } from "@/lib/ad-media";

type AdMediaContentProps = {
  mediaUrl: string;
  label: string;
  className?: string;
  hideOnError?: boolean;
  onLoadFailed?: () => void;
};

export default function AdMediaContent({
  mediaUrl,
  label,
  className = "",
  hideOnError = false,
  onLoadFailed,
}: AdMediaContentProps) {
  const [failed, setFailed] = useState(false);
  const kind = getAdMediaKind(mediaUrl);

  function handleError() {
    setFailed(true);
    onLoadFailed?.();
  }

  if (failed && hideOnError) {
    return null;
  }

  if (kind === "video") {
    return (
      <video
        src={mediaUrl}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onError={handleError}
      />
    );
  }

  return (
    <img
      src={mediaUrl}
      alt=""
      role="presentation"
      aria-label={label}
      className={className}
      onError={handleError}
    />
  );
}
