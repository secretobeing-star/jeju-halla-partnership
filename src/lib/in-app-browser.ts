export function isKakaoInAppBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /KAKAOTALK|KakaoTalk/i.test(navigator.userAgent);
}

export function isSamsungBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /SamsungBrowser/i.test(navigator.userAgent);
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

export function isIOSDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return true;
  }

  // iPadOS 13+ / some WebViews report as Macintosh with touch.
  if (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1) {
    return true;
  }

  // KakaoTalk iOS in-app browser sometimes uses Mac OS X + Mobile without iPhone token.
  if (
    /KAKAOTALK|KakaoTalk/i.test(ua) &&
    /Mac OS X/i.test(ua) &&
    /Mobile/i.test(ua) &&
    !/Android/i.test(ua)
  ) {
    return true;
  }

  return false;
}

/** Safari on iPhone/iPad — not Kakao in-app, not Chrome/Firefox iOS shells. */
export function isIOSSafariBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  if (!isIOSDevice() || isKakaoInAppBrowser()) {
    return false;
  }

  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|SamsungBrowser/i.test(ua)) {
    return false;
  }

  return true;
}

export function buildAndroidChromeIntentUrl(url: string) {
  return buildAndroidBrowserIntentUrl(url, "com.android.chrome");
}

export function buildAndroidSamsungBrowserIntentUrl(url: string) {
  return buildAndroidBrowserIntentUrl(url, "com.sec.android.app.sbrowser");
}

function buildAndroidBrowserIntentUrl(url: string, packageName: string) {
  try {
    const parsed = new URL(url);
    const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`.replace(
      /^\/+/,
      "",
    );
    const scheme = parsed.protocol.replace(":", "");
    return `intent://${path}#Intent;scheme=${scheme};package=${packageName};end`;
  } catch {
    return null;
  }
}

export function openInAndroidChrome(url: string) {
  const intentUrl = buildAndroidChromeIntentUrl(url);
  if (!intentUrl) {
    return false;
  }

  window.location.href = intentUrl;
  return true;
}

export function openInSamsungBrowser(url: string) {
  const intentUrl = buildAndroidSamsungBrowserIntentUrl(url);
  if (!intentUrl) {
    return false;
  }

  window.location.href = intentUrl;
  return true;
}

export async function openInIOSSafari(url: string) {
  const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (openedWindow) {
    return true;
  }

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ url, title: document.title });
      return true;
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        return false;
      }
    }
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return true;
}
