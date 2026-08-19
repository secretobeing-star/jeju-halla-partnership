export const SITE_MAP_REFRESH_EVENT = "site-map-refresh";

export function dispatchSiteMapRefresh() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(SITE_MAP_REFRESH_EVENT));
}

export async function waitForElementSize(
  element: HTMLElement,
  timeoutMs = 8000,
): Promise<boolean> {
  const startedAt = Date.now();

  while (element.clientWidth === 0 || element.clientHeight === 0) {
    if (Date.now() - startedAt >= timeoutMs) {
      return false;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  return true;
}

export function refreshMapLayout(map: naver.maps.Map, onLayout?: () => void) {
  const run = () => {
    map.autoResize();
    onLayout?.();
  };

  run();
  requestAnimationFrame(run);
  window.setTimeout(run, 120);
  window.setTimeout(run, 400);
}
