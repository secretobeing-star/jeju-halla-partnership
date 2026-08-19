"use client";

import { useEffect } from "react";

type SitePwaLoadingSplashProps = {
  message: string;
  imageUrl?: string | null;
  backgroundColor?: string | null;
  fullScreenImage?: boolean;
};

export default function SitePwaLoadingSplash({
  message,
  imageUrl,
  backgroundColor,
  fullScreenImage = false,
}: SitePwaLoadingSplashProps) {
  const resolvedImageUrl = imageUrl?.trim() || null;
  const resolvedMessage = message.trim();
  const useFullScreenImage = fullScreenImage && resolvedImageUrl != null;
  const ariaLabel = resolvedMessage || "앱 로딩 중";

  useEffect(() => {
    document.body.classList.add("pwa-loading-splash-open");
    const block = (event: Event) => {
      event.stopPropagation();
    };
    const blockMove = (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("touchstart", block, { capture: true });
    document.addEventListener("touchmove", blockMove, { capture: true, passive: false });
    document.addEventListener("touchend", block, { capture: true });
    return () => {
      document.body.classList.remove("pwa-loading-splash-open");
      document.removeEventListener("touchstart", block, { capture: true });
      document.removeEventListener("touchmove", blockMove, { capture: true });
      document.removeEventListener("touchend", block, { capture: true });
    };
  }, []);

  if (useFullScreenImage) {
    return (
      <div
        className="site-pwa-loading-splash site-pwa-loading-splash--fullscreen-image"
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        style={{ backgroundColor: backgroundColor ?? "#ffffff" }}
      >
        <img
          src={resolvedImageUrl}
          alt=""
          className="site-pwa-loading-splash__backdrop"
          decoding="sync"
        />
        {resolvedMessage ? (
          <div className="site-pwa-loading-splash__overlay">
            <p className="site-pwa-loading-splash__message">{resolvedMessage}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="site-pwa-loading-splash"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      style={{ backgroundColor: backgroundColor ?? "#ffffff" }}
    >
      <div className="site-pwa-loading-splash__inner">
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt=""
            className="site-pwa-loading-splash__image"
            decoding="sync"
          />
        ) : null}
        {resolvedMessage ? (
          <p className="site-pwa-loading-splash__message">{resolvedMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
