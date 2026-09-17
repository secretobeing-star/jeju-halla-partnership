const STORAGE_KEY = "halla-public-reload-at";
const CHANNEL_NAME = "halla-public-reload";

export function notifyPublicSiteReload() {
  if (typeof window === "undefined") return;
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
}

export function subscribePublicSiteReload(onReload: () => void) {
  if (typeof window === "undefined") return () => {};
  if (window.location.pathname.startsWith("/admin")) return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => onReload();
  } catch {
    channel = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      onReload();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
