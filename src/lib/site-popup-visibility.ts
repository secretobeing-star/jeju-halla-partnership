export const SITE_POPUP_VISIBILITY_EVENT = "site-popup-visibility-change";

export function isSitePopupVisible() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.body.classList.contains("site-popup-open");
}

export function dispatchSitePopupVisibility(visible: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SITE_POPUP_VISIBILITY_EVENT, {
      detail: { visible },
    }),
  );
}
