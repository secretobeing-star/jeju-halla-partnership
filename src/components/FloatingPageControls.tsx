"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { scrollToSection } from "@/lib/scroll-to-section";
import {
  formatSiteScaleLabel,
  SITE_SCALE_MAX_PERCENT,
  SITE_SCALE_MIN_PERCENT,
  siteScalePercentToFontSize,
  stepSiteScalePercent,
} from "@/lib/main-font-size";
import {
  loadUserBetaSettings,
  patchUserBetaSettings,
  USER_BETA_SETTINGS_EVENT,
} from "@/lib/user-beta-settings";

type FloatingPageControlsProps = {
  scrollTargetId?: string;
  showScrollAfterPx?: number;
  siteSizeEnabled?: boolean;
};

function getScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export default function FloatingPageControls({
  scrollTargetId = "site-header",
  showScrollAfterPx = 400,
  siteSizeEnabled = false,
}: FloatingPageControlsProps) {
  const [mounted, setMounted] = useState(false);
  const [scrollVisible, setScrollVisible] = useState(false);
  const [scalePercent, setScalePercent] = useState(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setScrollVisible(getScrollTop() > showScrollAfterPx);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
    };
  }, [showScrollAfterPx]);

  useEffect(() => {
    if (!siteSizeEnabled) {
      return;
    }

    const refresh = () => {
      setScalePercent(loadUserBetaSettings().site_scale_percent);
    };

    refresh();
    window.addEventListener(USER_BETA_SETTINGS_EVENT, refresh);
    return () => window.removeEventListener(USER_BETA_SETTINGS_EVENT, refresh);
  }, [siteSizeEnabled]);

  function adjustScale(direction: 1 | -1) {
    const next = stepSiteScalePercent(scalePercent, direction);
    patchUserBetaSettings({
      site_scale_percent: next,
      font_size: siteScalePercentToFontSize(next),
    });
    setScalePercent(next);
  }

  function handleScrollToTop() {
    scrollToSection(scrollTargetId, 0);
  }

  if (!mounted) {
    return null;
  }

  const canIncrease = scalePercent < SITE_SCALE_MAX_PERCENT;
  const canDecrease = scalePercent > SITE_SCALE_MIN_PERCENT;

  return createPortal(
    <div className="floating-page-controls fixed z-50 flex flex-col items-center gap-2">
      {siteSizeEnabled ? (
        <>
          <button
            type="button"
            onClick={() => adjustScale(1)}
            disabled={!canIncrease}
            aria-label="사이트 크기 확대"
            title="사이트 크기 확대"
            className="floating-control-button flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            +
          </button>
          <span className="floating-control-label rounded-full px-2 py-0.5 text-[10px] font-semibold">
            {formatSiteScaleLabel(scalePercent)}
          </span>
          <button
            type="button"
            onClick={() => adjustScale(-1)}
            disabled={!canDecrease}
            aria-label="사이트 크기 축소"
            title="사이트 크기 축소"
            className="floating-control-button flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            −
          </button>
        </>
      ) : null}

      <button
        type="button"
        onClick={handleScrollToTop}
        aria-label="맨 위로"
        title="맨 위로"
        className={`scroll-to-top-button floating-control-button flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          scrollVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
