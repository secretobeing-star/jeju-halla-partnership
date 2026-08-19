/** Layout viewport — not visualViewport. Soft keyboards must not drive layout. */
export const LAYOUT_VIEWPORT_DEBOUNCE_MS = 120;
const MIN_VALID_LAYOUT_WIDTH = 200;
const MIN_VALID_LAYOUT_HEIGHT = 200;

let lastValidLayoutWidth = 390;
let lastValidLayoutHeight = 844;

function isDocumentHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function rememberValidLayoutSize(width: number, height: number) {
  if (width >= MIN_VALID_LAYOUT_WIDTH) {
    lastValidLayoutWidth = width;
  }
  if (height >= MIN_VALID_LAYOUT_HEIGHT) {
    lastValidLayoutHeight = height;
  }
}

export function readLayoutViewportWidth() {
  if (typeof window === "undefined") {
    return 390;
  }

  const width = window.innerWidth;
  if (isDocumentHidden() || width < MIN_VALID_LAYOUT_WIDTH) {
    return lastValidLayoutWidth;
  }

  lastValidLayoutWidth = width;
  return width;
}

export function readLayoutViewportHeight() {
  if (typeof window === "undefined") {
    return 844;
  }

  const height = window.innerHeight;
  if (isDocumentHidden() || height < MIN_VALID_LAYOUT_HEIGHT) {
    return lastValidLayoutHeight;
  }

  lastValidLayoutHeight = height;
  return height;
}

export function isLayoutLandscape() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(orientation: landscape)").matches;
}

export function subscribeLayoutViewport(
  onChange: () => void,
  debounceMs = LAYOUT_VIEWPORT_DEBOUNCE_MS,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  let timer = 0;
  const schedule = () => {
    if (isDocumentHidden()) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < MIN_VALID_LAYOUT_WIDTH || height < MIN_VALID_LAYOUT_HEIGHT) {
      return;
    }

    rememberValidLayoutSize(width, height);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      onChange();
    }, debounceMs);
  };

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);

  const orientationQuery = window.matchMedia("(orientation: landscape)");
  if (typeof orientationQuery.addEventListener === "function") {
    orientationQuery.addEventListener("change", schedule);
  } else {
    orientationQuery.addListener(schedule);
  }

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("orientationchange", schedule);
    if (typeof orientationQuery.removeEventListener === "function") {
      orientationQuery.removeEventListener("change", schedule);
    } else {
      orientationQuery.removeListener(schedule);
    }
  };
}
