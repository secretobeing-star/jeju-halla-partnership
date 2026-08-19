import {
  isLayoutLandscape,
  readLayoutViewportHeight,
  readLayoutViewportWidth,
} from "@/lib/layout-viewport";
import {
  TABLET_LG_VIEWPORT_MAX_WIDTH,
  TABLET_VIEWPORT_MAX_WIDTH,
  TABLET_VIEWPORT_MIN_WIDTH,
} from "@/lib/partner-list-layout";
import {
  DEFAULT_PWA_BACKGROUND_COLOR,
  DEFAULT_PWA_THEME_COLOR,
  isStandaloneDisplayMode,
} from "@/lib/site-pwa";

/** Fold8 와이드 커버 상한 (S시리즈·아이폰 Max와 폭이 겹침 → 비율로 구분) */
export const PWA_FOLD_COVER_MAX_WIDTH = 430;

/** 휴대폰·Fold 커버 상한 */
export const PWA_PHONE_MAX_WIDTH = TABLET_VIEWPORT_MIN_WIDTH - 1;

/**
 * Fold 와이드 커버(약 10:16 = 1.6)와 S·바형(약 19.5:9 = 2.17) 구분.
 * 이보다 세로가 짧으면 폴드 커버 이미지를 쓴다.
 */
export const PWA_FOLD_COVER_MAX_HEIGHT_WIDTH_RATIO = 1.72;

/** Galaxy S·A 바형 세로 (약 19.5:9~20:9) */
export const PWA_S_BAR_MIN_HEIGHT_WIDTH_RATIO = 2;

/** Galaxy Tab A9~A11·Plus 세로 폭 (약 800px CSS) */
export const PWA_TAB_A_PORTRAIT_WIDTH_MIN = 768;
export const PWA_TAB_A_PORTRAIT_WIDTH_MAX = 900;

/** Galaxy Tab A9+/A11+ 등 16:10 가로 (약 1280~1344px CSS) */
export const PWA_TAB_A_LANDSCAPE_WIDTH_MIN = 1180;
export const PWA_TAB_A_LANDSCAPE_WIDTH_MAX = 1366;
export const PWA_TAB_A_LANDSCAPE_HEIGHT_MAX = 920;

/**
 * PWA 앱 기준 뷰포트 구간
 * - phone: Fold 커버·일반 휴대폰 (~767px)
 * - tablet: Fold 펼침·Galaxy Tab A/S·iPad 세로 (~768–1279px)
 * - tablet-lg: iPad Pro·Tab Ultra·Tab A+ 가로 (~1280–1439px)
 * - wide: 그 외 넓은 화면
 */
export type PwaDeviceViewportKind = "phone" | "tablet" | "tablet-lg" | "wide";

export function getPwaDeviceViewportKind(width: number): PwaDeviceViewportKind {
  if (width <= PWA_PHONE_MAX_WIDTH) {
    return "phone";
  }

  if (width <= TABLET_VIEWPORT_MAX_WIDTH) {
    return "tablet";
  }

  if (width <= TABLET_LG_VIEWPORT_MAX_WIDTH) {
    return "tablet-lg";
  }

  return "wide";
}

export function isPwaFoldCoverWidth(
  width: number,
  height = typeof window === "undefined" ? TABLET_VIEWPORT_MIN_WIDTH : readLayoutViewportHeight(),
) {
  if (width > PWA_FOLD_COVER_MAX_WIDTH) {
    return false;
  }

  return height < width * PWA_FOLD_COVER_MAX_HEIGHT_WIDTH_RATIO;
}

/** Galaxy S·일반 바형 폰 (폴드 커버가 아닌 세로 긴 휴대폰) */
export function isPwaSBarPhone(
  width: number,
  height = typeof window === "undefined" ? TABLET_VIEWPORT_MIN_WIDTH : readLayoutViewportHeight(),
) {
  if (width > PWA_PHONE_MAX_WIDTH || isPwaFoldCoverWidth(width, height)) {
    return false;
  }

  return height >= width * PWA_S_BAR_MIN_HEIGHT_WIDTH_RATIO;
}

/** S시리즈를 포함한 바형 휴대폰 (폴드 커버 제외) */
export function isPwaBarPhone(
  width: number,
  height = typeof window === "undefined" ? TABLET_VIEWPORT_MIN_WIDTH : readLayoutViewportHeight(),
) {
  return getPwaDeviceViewportKind(width) === "phone" && !isPwaFoldCoverWidth(width, height);
}

export function readPwaDeviceViewportWidth() {
  if (typeof window === "undefined") {
    return TABLET_VIEWPORT_MIN_WIDTH;
  }

  return readLayoutViewportWidth();
}

export function readPwaDeviceViewportHeight() {
  if (typeof window === "undefined") {
    return TABLET_VIEWPORT_MIN_WIDTH;
  }

  return readLayoutViewportHeight();
}

/** Galaxy Tab A9~A11·Plus (16:10, 세로 ~800px / 가로 ~1280px) */
export function isPwaTabAViewport(
  width: number,
  height = readPwaDeviceViewportHeight(),
) {
  if (
    width >= PWA_TAB_A_PORTRAIT_WIDTH_MIN &&
    width <= PWA_TAB_A_PORTRAIT_WIDTH_MAX &&
    height >= width * 1.45
  ) {
    return true;
  }

  if (
    width >= PWA_TAB_A_LANDSCAPE_WIDTH_MIN &&
    width <= PWA_TAB_A_LANDSCAPE_WIDTH_MAX &&
    height <= PWA_TAB_A_LANDSCAPE_HEIGHT_MAX &&
    height >= width * 0.55
  ) {
    return true;
  }

  return false;
}

/** PWA에서 iPad Pro·Tab Ultra 가로 등도 태블릿 제휴 설정 구간으로 본다 */
export function shouldUsePwaTabletPartnerLayout(width: number) {
  return (
    isStandaloneDisplayMode() &&
    width >= TABLET_VIEWPORT_MIN_WIDTH &&
    width <= TABLET_LG_VIEWPORT_MAX_WIDTH
  );
}


function syncPwaDeviceViewportClasses(
  root: HTMLElement,
  width: number,
  height: number,
) {
  const kind = getPwaDeviceViewportKind(width);
  const foldCover = kind === "phone" && isPwaFoldCoverWidth(width, height);
  const sBar = isPwaSBarPhone(width, height);
  const bar = isPwaBarPhone(width, height);
  const tabA = isPwaTabAViewport(width, height);

  root.classList.toggle("pwa-v-phone", kind === "phone");
  root.classList.toggle("pwa-v-tablet", kind === "tablet");
  root.classList.toggle("pwa-v-tablet-lg", kind === "tablet-lg");
  root.classList.toggle("pwa-v-wide", kind === "wide");
  root.classList.toggle("pwa-v-fold-cover", foldCover);
  root.classList.toggle("pwa-v-s-bar", sBar);
  root.classList.toggle("pwa-v-bar", bar);
  const landscape = isLayoutLandscape();

  root.classList.toggle("pwa-v-tab-a", tabA);
  root.classList.toggle("pwa-v-landscape", landscape);
  root.classList.toggle("pwa-v-portrait", !landscape);

  // 하위 호환 — Fold·Tab·iPad 공통 뷰포트 보정
  root.classList.toggle("pwa-fold-cover", kind === "phone");
  root.classList.toggle("pwa-fold-tablet", kind === "tablet");
  root.classList.toggle("pwa-fold-tablet-lg", kind === "tablet-lg");
  root.classList.toggle("pwa-fold-wide", kind === "tablet-lg" || kind === "wide");
}

let lastFoldViewportSignature = "";

export function resetPwaFoldViewportSignature() {
  lastFoldViewportSignature = "";
}

export function syncPwaFoldViewportClasses(root: HTMLElement = document.documentElement) {
  if (typeof window === "undefined") {
    return;
  }

  const standalone = isStandaloneDisplayMode();
  const width = readPwaDeviceViewportWidth();
  const height = readPwaDeviceViewportHeight();
  const landscape = isLayoutLandscape();
  const signature = `${standalone}|${Math.round(width)}|${Math.round(height)}|${landscape ? "l" : "p"}`;

  if (signature === lastFoldViewportSignature) {
    return;
  }

  lastFoldViewportSignature = signature;
  root.classList.toggle("pwa-standalone", standalone);
  syncPwaDeviceViewportClasses(root, width, height);
}

function readCssColorVariable(
  name: "--pwa-chrome-tab-theme-color" | "--pwa-taskbar-theme-color" | "--pwa-theme-color" | "--pwa-background-color",
) {
  if (typeof document === "undefined") {
    return "";
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** PWA 하단 내비게이션 바 — 관리자 태스크바 테마 색상과 동기화 */
export function resolvePwaTaskbarThemeColorFromDocument() {
  if (typeof document === "undefined") {
    return DEFAULT_PWA_THEME_COLOR;
  }

  return (
    readCssColorVariable("--pwa-taskbar-theme-color") ||
    readCssColorVariable("--pwa-theme-color") ||
    document.querySelector('meta[name="navigation-bar-color"]:not([media])')?.getAttribute("content")?.trim() ||
    DEFAULT_PWA_THEME_COLOR
  );
}

export function resolvePwaChromeTabThemeColorFromDocument() {
  if (typeof document === "undefined") {
    return DEFAULT_PWA_THEME_COLOR;
  }

  return (
    readCssColorVariable("--pwa-chrome-tab-theme-color") ||
    document.querySelector('meta[name="theme-color"]:not([media])')?.getAttribute("content")?.trim() ||
    resolvePwaTaskbarThemeColorFromDocument()
  );
}

/** @deprecated use resolvePwaTaskbarThemeColorFromDocument */
export function resolvePwaNavigationThemeColorFromDocument() {
  return resolvePwaTaskbarThemeColorFromDocument();
}

export function resolvePwaBackgroundColorFromDocument() {
  if (typeof document === "undefined") {
    return DEFAULT_PWA_BACKGROUND_COLOR;
  }

  return (
    readCssColorVariable("--pwa-background-color") ||
    document.querySelector('meta[name="msapplication-TileColor"]')?.getAttribute("content")?.trim() ||
    resolvePwaTaskbarThemeColorFromDocument()
  );
}

function setThemeMetaContent(name: "theme-color" | "navigation-bar-color", color: string) {
  for (const media of [null, "(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"] as const) {
    const selector = media
      ? `meta[name="${name}"][media="${media}"]`
      : `meta[name="${name}"]:not([media])`;
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", name);
      if (media) {
        meta.setAttribute("media", media);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }
}

export function syncPwaNavigationThemeColor(options?: {
  chromeTabThemeColor?: string;
  taskbarThemeColor?: string;
  backgroundColor?: string;
}) {
  if (typeof document === "undefined") {
    return;
  }

  const chromeTabColor =
    options?.chromeTabThemeColor?.trim() || resolvePwaChromeTabThemeColorFromDocument();
  const taskbarColor =
    options?.taskbarThemeColor?.trim() || resolvePwaTaskbarThemeColorFromDocument();
  const backgroundColor =
    options?.backgroundColor?.trim() || resolvePwaBackgroundColorFromDocument();
  const standalone = isStandaloneDisplayMode();
  const themeColorForBrowser = standalone ? taskbarColor : chromeTabColor;

  setThemeMetaContent("theme-color", themeColorForBrowser);
  setThemeMetaContent("navigation-bar-color", taskbarColor);

  document.documentElement.style.colorScheme = "light";
  document.documentElement.style.setProperty("--pwa-chrome-tab-theme-color", chromeTabColor);
  document.documentElement.style.setProperty("--pwa-taskbar-theme-color", taskbarColor);
  document.documentElement.style.setProperty("--pwa-theme-color", taskbarColor);
  document.documentElement.style.setProperty("--pwa-navigation-theme-color", taskbarColor);

  if (isStandaloneDisplayMode()) {
    document.documentElement.style.backgroundColor = backgroundColor;
    document.body.style.backgroundColor = backgroundColor;
  }
}

/** @deprecated use getPwaDeviceViewportKind */
export type PwaFoldViewportKind = PwaDeviceViewportKind;

/** @deprecated use getPwaDeviceViewportKind */
export function getPwaFoldViewportKind(width: number) {
  return getPwaDeviceViewportKind(width);
}

/** @deprecated use readPwaDeviceViewportWidth */
export function readPwaFoldViewportWidth() {
  return readPwaDeviceViewportWidth();
}
