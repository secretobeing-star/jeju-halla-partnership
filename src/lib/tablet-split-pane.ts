import { useEffect, useState } from "react";
import { readLayoutViewportWidth } from "@/lib/layout-viewport";

/** partner-list-layout·pwa-fold-viewport와 동일 (순환 import 방지를 위해 로컬 정의) */
export const TABLET_SPLIT_PANE_MIN_WIDTH = 768;

/** @deprecated 상한 제거 — PC(1440px+)에서도 분할 UI 적용 */
export const TABLET_SPLIT_PANE_MAX_WIDTH = Number.POSITIVE_INFINITY;

export const TABLET_SPLIT_PANE_QUERY = `(min-width: ${TABLET_SPLIT_PANE_MIN_WIDTH}px)`;

export function isTabletSplitPaneViewport(width = readTabletSplitPaneWidth()) {
  return width >= TABLET_SPLIT_PANE_MIN_WIDTH;
}

export function readTabletSplitPaneWidth() {
  if (typeof window === "undefined") {
    return TABLET_SPLIT_PANE_MIN_WIDTH;
  }

  return readLayoutViewportWidth();
}

export function readTabletSplitPaneEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(TABLET_SPLIT_PANE_QUERY).matches;
}

export function useTabletSplitPane() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(TABLET_SPLIT_PANE_QUERY);
    const update = () => {
      setEnabled(media.matches);
    };

    update();
    media.addEventListener("change", update);
    window.addEventListener("orientationchange", update);

    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return enabled;
}
