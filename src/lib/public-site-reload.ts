const STORAGE_KEY = "halla-public-reload-at";
const CHANNEL_NAME = "halla-public-reload";
const NOTIFY_DEBOUNCE_MS = 500;
const RELOAD_DEBOUNCE_MS = 800;

let notifyTimer: number | null = null;

export function notifyPublicSiteReload() {
  if (typeof window === "undefined") return;
  if (notifyTimer != null) {
    window.clearTimeout(notifyTimer);
  }
  notifyTimer = window.setTimeout(() => {
    notifyTimer = null;
    const stamp = String(Date.now());
    try {
      localStorage.setItem(STORAGE_KEY, stamp);
    } catch {
      // ignore
    }
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(stamp);
      channel.close();
    } catch {
      // ignore
    }
  }, NOTIFY_DEBOUNCE_MS);
}

export function subscribePublicSiteReload(onReload: () => void) {
  if (typeof window === "undefined") return () => {};
  if (window.location.pathname.startsWith("/admin")) return () => {};

  let reloadTimer: number | null = null;
  const scheduleReload = () => {
    if (reloadTimer != null) {
      window.clearTimeout(reloadTimer);
    }
    reloadTimer = window.setTimeout(() => {
      reloadTimer = null;
      onReload();
    }, RELOAD_DEBOUNCE_MS);
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => scheduleReload();
  } catch {
    channel = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      scheduleReload();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    if (reloadTimer != null) {
      window.clearTimeout(reloadTimer);
    }
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
