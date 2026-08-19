import { useEffect, useState } from "react";
import { readLayoutViewportWidth, subscribeLayoutViewport } from "@/lib/layout-viewport";

/** Tailwind `xl` 미만 — 현재 보이는 레이아웃 폭 기준 */
export const MOBILE_VIEWPORT_MAX_WIDTH = 1279;

export const MOBILE_VIEWPORT_QUERY = `(max-width: ${MOBILE_VIEWPORT_MAX_WIDTH}px)`;

/** 실제 모바일·태블릿 기기 폭 — viewport meta 변경과 무관 */
export const MOBILE_DEVICE_MAX_WIDTH = 1279;

export const MOBILE_DEVICE_QUERY = `(max-device-width: ${MOBILE_DEVICE_MAX_WIDTH}px)`;

export const MOBILE_PC_LAYOUT_WIDTH = 1280;

export function isMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.matchMedia(MOBILE_DEVICE_QUERY).matches) {
    return true;
  }

  return Math.min(window.screen.width, window.screen.height) <= MOBILE_DEVICE_MAX_WIDTH;
}

export function isMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

export function useIsMobileDevice() {
  const [isMobileDeviceState, setIsMobileDeviceState] = useState(() => isMobileDevice());

  useEffect(() => {
    const media = window.matchMedia(MOBILE_DEVICE_QUERY);
    const update = () => setIsMobileDeviceState(isMobileDevice());

    update();
    media.addEventListener("change", update);
    window.addEventListener("orientationchange", update);

    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isMobileDeviceState;
}

export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

const COMPACT_BOARD_LIST_QUERY = "(max-width: 767px)";

function readMobilePcModeEnabled() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.documentElement.classList.contains("mobile-pc-mode");
}

/** 실제 기기·모바일 PC 모드에서 게시판 목록 레이아웃 결정 */
export function useBoardListLayout() {
  const [mobilePcMode, setMobilePcMode] = useState(false);
  const [narrowLayout, setNarrowLayout] = useState(false);
  const [visibleWidth, setVisibleWidth] = useState<number | null>(null);

  useEffect(() => {
    const updateMobilePcMode = () => {
      setMobilePcMode(readMobilePcModeEnabled());
    };

    const updateVisibleWidth = () => {
      const nextWidth = readLayoutViewportWidth();
      setVisibleWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    const updateNarrowLayout = () => {
      setNarrowLayout(window.matchMedia(COMPACT_BOARD_LIST_QUERY).matches);
    };

    updateMobilePcMode();
    updateVisibleWidth();
    updateNarrowLayout();

    const classObserver = new MutationObserver(updateMobilePcMode);
    classObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const narrowMedia = window.matchMedia(COMPACT_BOARD_LIST_QUERY);
    narrowMedia.addEventListener("change", updateNarrowLayout);
    const unsubscribeLayout = subscribeLayoutViewport(updateVisibleWidth);

    return () => {
      classObserver.disconnect();
      narrowMedia.removeEventListener("change", updateNarrowLayout);
      unsubscribeLayout();
    };
  }, []);

  const compactLayout =
    !mobilePcMode &&
    (narrowLayout || (visibleWidth !== null && visibleWidth < 768));
  const listMaxWidth =
    compactLayout && !mobilePcMode && visibleWidth
      ? Math.max(visibleWidth - 64, 260)
      : null;

  return { compactLayout, listMaxWidth, mobilePcMode };
}
