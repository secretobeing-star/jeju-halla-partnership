export function isMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.matchMedia("(max-device-width: 1279px)").matches) {
    return true;
  }

  return Math.min(window.screen.width, window.screen.height) <= 1279;
}
