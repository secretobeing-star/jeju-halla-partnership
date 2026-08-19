import { isAndroidDevice, isIOSDevice, isSamsungBrowser } from "@/lib/in-app-browser";
import { isStandaloneDisplayMode, resolvePwaStartUrl, type SitePwaSettingsSource } from "@/lib/site-pwa";

type AndroidLaunchIntentOptions = {
  packageName?: string | null;
  /** false 권장: fallback 이 있으면 삼성 인터넷이 WebAPK 대신 같은 탭으로 열어 버림 */
  includeFallback?: boolean;
  newTask?: boolean;
};

function buildAndroidPwaLaunchIntentUrl(
  targetUrl: string,
  options: AndroidLaunchIntentOptions = {},
) {
  try {
    const parsed = new URL(targetUrl);
    const path = `${parsed.host}${parsed.pathname}${parsed.search}`.replace(/^\/+/, "");
    const scheme = parsed.protocol.replace(":", "") || "https";
    const parts = [
      `scheme=${scheme}`,
      "action=android.intent.action.VIEW",
      "category=android.intent.category.BROWSABLE",
    ];

    if (options.newTask !== false) {
      // FLAG_ACTIVITY_NEW_TASK — 브라우저 액티비티 밖으로 WebAPK 기동
      parts.push("launchFlags=0x10000000");
    }

    if (options.packageName) {
      parts.push(`package=${options.packageName}`);
    }

    if (options.includeFallback) {
      parts.push(`S.browser_fallback_url=${encodeURIComponent(targetUrl)}`);
    }

    return `intent://${path}#Intent;${parts.join(";")};end`;
  } catch {
    return null;
  }
}

function navigateWithAnchor(url: string) {
  if (typeof document === "undefined") {
    window.location.assign(url);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.setAttribute("aria-hidden", "true");
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function withLaunchParam(url: string) {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    parsed.searchParams.set("pwa-open", "1");
    return parsed.href;
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}pwa-open=1`;
  }
}

/**
 * 설치된 PWA(WebAPK) 기동용 URL.
 * 현재 탭 주소(필터·팝업 등)보다 manifest start_url 을 우선해 매칭을 안정화한다.
 */
export function resolvePwaLaunchUrl(settings: SitePwaSettingsSource | null | undefined) {
  const startUrl = resolvePwaStartUrl(settings);

  if (typeof window === "undefined") {
    return startUrl;
  }

  try {
    return new URL(startUrl, window.location.origin).href;
  } catch {
    return window.location.href;
  }
}

function launchAndroidInstalledPwa(targetUrl: string) {
  const primaryIntent = buildAndroidPwaLaunchIntentUrl(targetUrl, {
    includeFallback: false,
    newTask: true,
  });

  if (isSamsungBrowser()) {
    // 삼성 인터넷은 location.assign(intent) + fallback 조합 시 같은 탭 재로딩만 하는 경우가 많음
    if (primaryIntent) {
      navigateWithAnchor(primaryIntent);
    } else {
      navigateWithAnchor(targetUrl);
    }

    window.setTimeout(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const chromeIntent = buildAndroidPwaLaunchIntentUrl(targetUrl, {
        packageName: "com.android.chrome",
        includeFallback: false,
        newTask: true,
      });
      if (chromeIntent) {
        navigateWithAnchor(chromeIntent);
      }
    }, 650);

    window.setTimeout(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      // 최후: https 직접 이동 (홈 화면 바로가기가 브라우저 기반인 경우)
      window.location.assign(targetUrl);
    }, 1400);

    return true;
  }

  if (primaryIntent) {
    window.location.assign(primaryIntent);
    return true;
  }

  const fallbackIntent = buildAndroidPwaLaunchIntentUrl(targetUrl, {
    includeFallback: true,
    newTask: true,
  });
  if (fallbackIntent) {
    window.location.assign(fallbackIntent);
    return true;
  }

  window.location.assign(targetUrl);
  return true;
}

export function launchInstalledPwa(
  settings: SitePwaSettingsSource | null | undefined,
  options: { targetUrl?: string } = {},
) {
  if (typeof window === "undefined") {
    return false;
  }

  const targetUrl = withLaunchParam(options.targetUrl ?? resolvePwaLaunchUrl(settings));

  if (isStandaloneDisplayMode()) {
    window.location.assign(targetUrl);
    return true;
  }

  if (isAndroidDevice()) {
    return launchAndroidInstalledPwa(targetUrl);
  }

  if (isIOSDevice()) {
    const openedWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (openedWindow) {
      return true;
    }
  }

  window.location.assign(targetUrl);
  return true;
}
