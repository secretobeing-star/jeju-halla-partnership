import {
  isPwaEnabled,
  isStandaloneDisplayMode,
  resolvePwaBackgroundColor,
  resolvePwaIconUrl,
  type SitePwaSettingsSource,
} from "@/lib/site-pwa";
import { TABLET_VIEWPORT_MIN_WIDTH } from "@/lib/partner-list-layout";
import {
  isPwaFoldCoverWidth,
  readPwaDeviceViewportHeight,
  readPwaDeviceViewportWidth,
} from "@/lib/pwa-fold-viewport";

export const MAX_PWA_LOADING_DURATION_MS = 10000;

/** 일반 갤럭시·아이폰 세로 (20:9) */
export const PWA_LOADING_IMAGE_RECOMMENDED_WIDTH = 1080;
export const PWA_LOADING_IMAGE_RECOMMENDED_HEIGHT = 2400;

/** Galaxy Z Fold8 와이드 커버 (10:16) */
export const PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_WIDTH = 1080;
export const PWA_LOADING_IMAGE_FOLD_COVER_RECOMMENDED_HEIGHT = 1728;

/** Fold8 펼침·Galaxy Tab·iPad 세로 (3:4) */
export const PWA_LOADING_IMAGE_TABLET_RECOMMENDED_WIDTH = 1848;
export const PWA_LOADING_IMAGE_TABLET_RECOMMENDED_HEIGHT = 2448;

/** Fold8 Ultra 펼침·넓은 태블릿 (10:9) */
export const PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_WIDTH = 2256;
export const PWA_LOADING_IMAGE_TABLET_ULTRA_RECOMMENDED_HEIGHT = 2504;

const PWA_LOADING_MESSAGE_CACHE_KEY = "site_pwa_loading_message";
const PWA_LOADING_IMAGE_CACHE_KEY = "site_pwa_loading_image_url";
const PWA_LOADING_IMAGE_FOLD_COVER_CACHE_KEY = "site_pwa_loading_image_url_fold_cover";
const PWA_LOADING_IMAGE_TABLET_CACHE_KEY = "site_pwa_loading_image_url_tablet";
const PWA_LOADING_IMAGE_TABLET_ULTRA_CACHE_KEY = "site_pwa_loading_image_url_tablet_ultra";
const PWA_ENABLED_CACHE_KEY = "site_pwa_enabled";
const PWA_LOADING_ENABLED_CACHE_KEY = "site_pwa_loading_enabled";

/** Fold8 Ultra 등 10:9에 가까운 펼침 화면 (3:4보다 가로가 넓음) */
const PWA_TABLET_ULTRA_MIN_WIDTH_HEIGHT_RATIO = 0.84;

export function normalizePwaLoadingDurationMs(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(MAX_PWA_LOADING_DURATION_MS, Math.round(value)));
}

export function isPwaLoadingEnabled(settings: SitePwaSettingsSource | null | undefined) {
  return isPwaEnabled(settings) && (settings?.site_pwa_loading_enabled ?? true);
}

export function readCachedPwaSplashEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      localStorage.getItem(PWA_ENABLED_CACHE_KEY) === "1" &&
      localStorage.getItem(PWA_LOADING_ENABLED_CACHE_KEY) !== "0"
    );
  } catch {
    return false;
  }
}

export function isPwaPageReload() {
  if (typeof window === "undefined") {
    return false;
  }

  const [entry] = performance.getEntriesByType("navigation");
  if (entry instanceof PerformanceNavigationTiming && entry.type === "reload") {
    return true;
  }

  const legacyNavigation = performance as Performance & {
    navigation?: { type?: number };
  };

  return legacyNavigation.navigation?.type === 1;
}

export function shouldUsePwaLoadingSplash(
  settings: SitePwaSettingsSource | null | undefined,
  standalone = isStandaloneDisplayMode(),
) {
  if (!standalone || isPwaPageReload()) {
    return false;
  }

  if (isPwaLoadingEnabled(settings)) {
    return true;
  }

  if (!settings?.site_pwa_enabled && readCachedPwaSplashEnabled()) {
    return true;
  }

  return false;
}

export function getPwaLoadingMessage(settings?: SitePwaSettingsSource | null) {
  const configured = settings?.site_pwa_loading_message?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(PWA_LOADING_MESSAGE_CACHE_KEY)?.trim();
      if (cached) {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
  }

  return "";
}

export function isPwaTabletLoadingViewport(width = readPwaDeviceViewportWidth()) {
  return width >= TABLET_VIEWPORT_MIN_WIDTH;
}

export function isPwaTabletUltraLoadingViewport(
  width = readPwaDeviceViewportWidth(),
  height = readPwaDeviceViewportHeight(),
) {
  if (width < TABLET_VIEWPORT_MIN_WIDTH || height <= 0) {
    return false;
  }

  return width / height >= PWA_TABLET_ULTRA_MIN_WIDTH_HEIGHT_RATIO;
}

export function getPwaLoadingPhoneImageUrl(settings?: SitePwaSettingsSource | null) {
  const configured = settings?.site_pwa_loading_image_url?.trim();
  if (configured) {
    return configured;
  }

  const iconUrl = resolvePwaIconUrl(settings)?.trim();
  if (iconUrl) {
    return iconUrl;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(PWA_LOADING_IMAGE_CACHE_KEY)?.trim();
      if (cached) {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
  }

  return null;
}

export function getPwaLoadingFoldCoverImageUrl(settings?: SitePwaSettingsSource | null) {
  const configured = settings?.site_pwa_loading_image_url_fold_cover?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(PWA_LOADING_IMAGE_FOLD_COVER_CACHE_KEY)?.trim();
      if (cached) {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
  }

  return getPwaLoadingPhoneImageUrl(settings);
}

export function getPwaLoadingTabletImageUrl(settings?: SitePwaSettingsSource | null) {
  const configured = settings?.site_pwa_loading_image_url_tablet?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(PWA_LOADING_IMAGE_TABLET_CACHE_KEY)?.trim();
      if (cached) {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
  }

  return getPwaLoadingPhoneImageUrl(settings);
}

export function getPwaLoadingTabletUltraImageUrl(settings?: SitePwaSettingsSource | null) {
  const configured = settings?.site_pwa_loading_image_url_tablet_ultra?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(PWA_LOADING_IMAGE_TABLET_ULTRA_CACHE_KEY)?.trim();
      if (cached) {
        return cached;
      }
    } catch {
      // ignore storage errors
    }
  }

  return getPwaLoadingTabletImageUrl(settings);
}

export function getPwaLoadingImageUrl(
  settings?: SitePwaSettingsSource | null,
  viewportWidth = readPwaDeviceViewportWidth(),
  viewportHeight = readPwaDeviceViewportHeight(),
) {
  if (isPwaTabletLoadingViewport(viewportWidth)) {
    if (isPwaTabletUltraLoadingViewport(viewportWidth, viewportHeight)) {
      return getPwaLoadingTabletUltraImageUrl(settings);
    }

    return getPwaLoadingTabletImageUrl(settings);
  }

  if (isPwaFoldCoverWidth(viewportWidth, viewportHeight)) {
    return getPwaLoadingFoldCoverImageUrl(settings);
  }

  return getPwaLoadingPhoneImageUrl(settings);
}

export function getPwaLoadingDurationMs(settings?: SitePwaSettingsSource | null) {
  return normalizePwaLoadingDurationMs(settings?.site_pwa_loading_duration_ms);
}

export function isPwaLoadingImageFullscreen(
  settings?: SitePwaSettingsSource | null,
  viewportWidth = readPwaDeviceViewportWidth(),
  viewportHeight = readPwaDeviceViewportHeight(),
) {
  return Boolean(getPwaLoadingImageUrl(settings, viewportWidth, viewportHeight));
}

export function getPwaLoadingBackgroundColor(settings?: SitePwaSettingsSource | null) {
  return resolvePwaBackgroundColor(settings);
}

export function cachePwaLoadingSettings(settings?: SitePwaSettingsSource | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PWA_ENABLED_CACHE_KEY, isPwaEnabled(settings) ? "1" : "0");
    localStorage.setItem(
      PWA_LOADING_ENABLED_CACHE_KEY,
      settings?.site_pwa_loading_enabled === false ? "0" : "1",
    );

    const message = settings?.site_pwa_loading_message?.trim();
    if (message) {
      localStorage.setItem(PWA_LOADING_MESSAGE_CACHE_KEY, message);
    } else {
      localStorage.removeItem(PWA_LOADING_MESSAGE_CACHE_KEY);
    }

    const imageUrl = settings?.site_pwa_loading_image_url?.trim();
    if (imageUrl) {
      localStorage.setItem(PWA_LOADING_IMAGE_CACHE_KEY, imageUrl);
    } else {
      localStorage.removeItem(PWA_LOADING_IMAGE_CACHE_KEY);
    }

    const foldCoverImageUrl = settings?.site_pwa_loading_image_url_fold_cover?.trim();
    if (foldCoverImageUrl) {
      localStorage.setItem(PWA_LOADING_IMAGE_FOLD_COVER_CACHE_KEY, foldCoverImageUrl);
    } else {
      localStorage.removeItem(PWA_LOADING_IMAGE_FOLD_COVER_CACHE_KEY);
    }

    const tabletImageUrl = settings?.site_pwa_loading_image_url_tablet?.trim();
    if (tabletImageUrl) {
      localStorage.setItem(PWA_LOADING_IMAGE_TABLET_CACHE_KEY, tabletImageUrl);
    } else {
      localStorage.removeItem(PWA_LOADING_IMAGE_TABLET_CACHE_KEY);
    }

    const tabletUltraImageUrl = settings?.site_pwa_loading_image_url_tablet_ultra?.trim();
    if (tabletUltraImageUrl) {
      localStorage.setItem(PWA_LOADING_IMAGE_TABLET_ULTRA_CACHE_KEY, tabletUltraImageUrl);
    } else {
      localStorage.removeItem(PWA_LOADING_IMAGE_TABLET_ULTRA_CACHE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

/** 오프라인 여부 확인 (SSR 세이프) */
export function isPwaOffline(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return !navigator.onLine;
}

/** 오프라인/온라인 상태 감지 이벤트 리스너 등록 */
export function subscribePwaNetworkStatus(onChange: (online: boolean) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => onChange(true);
  const handleOffline = () => onChange(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}