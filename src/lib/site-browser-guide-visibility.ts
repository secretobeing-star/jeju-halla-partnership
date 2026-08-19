export const SITE_BROWSER_GUIDE_VISIBILITY_EVENT = "site-browser-guide-visibility-change";

export function isSiteBrowserGuideVisible() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.body.classList.contains("site-browser-guide-visible");
}

export function dispatchSiteBrowserGuideVisibility(visible: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SITE_BROWSER_GUIDE_VISIBILITY_EVENT, {
      detail: { visible },
    }),
  );
}
