"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatSiteScaleLabel,
  SITE_SCALE_MAX_PERCENT,
  SITE_SCALE_MIN_PERCENT,
  stepSiteScalePercent,
} from "@/lib/main-font-size";
import {
  loadUserBetaSettings,
  patchUserBetaSettings,
  USER_BETA_SETTINGS_EVENT,
} from "@/lib/user-beta-settings";

type FloatingSiteSizeControlsProps = {
  enabled?: boolean;
};

export default function FloatingSiteSizeControls({
  enabled = false,
}: FloatingSiteSizeControlsProps) {
  const [mounted, setMounted] = useState(false);
  const [scalePercent, setScalePercent] = useState(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refresh = () => {
      setScalePercent(loadUserBetaSettings().site_scale_percent);
    };

    refresh();
    window.addEventListener(USER_BETA_SETTINGS_EVENT, refresh);
    return () => window.removeEventListener(USER_BETA_SETTINGS_EVENT, refresh);
  }, [enabled]);

  function adjustScale(direction: 1 | -1) {
    const next = stepSiteScalePercent(scalePercent, direction);
    patchUserBetaSettings({ site_scale_percent: next });
    setScalePercent(next);
  }

  if (!mounted || !enabled) {
    return null;
  }

  const canIncrease = scalePercent < SITE_SCALE_MAX_PERCENT;
  const canDecrease = scalePercent > SITE_SCALE_MIN_PERCENT;

  return createPortal(
    <div
      className="floating-site-size-controls fixed z-50 flex flex-col items-center gap-2"
      aria-label="사이트 크기 조절"
    >
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
    </div>,
    document.body,
  );
}
