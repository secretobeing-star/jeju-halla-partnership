const STORAGE_PREFIX = "site-popup-dismissed";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function isSitePopupDismissedToday(popupId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(`${STORAGE_PREFIX}:${popupId}`) === getTodayKey();
}

export function dismissSitePopupForToday(popupId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${STORAGE_PREFIX}:${popupId}`, getTodayKey());
}
