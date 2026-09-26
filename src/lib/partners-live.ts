const CHANNEL_NAME = "halla-partners-live";
export const PARTNERS_CHANGED_EVENT = "halla-partners-changed";

export function notifyPartnersChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(PARTNERS_CHANGED_EVENT));
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage("changed");
    channel.close();
  } catch {
    // ignore
  }
}

export function subscribePartnersChanged(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onChange();
  window.addEventListener(PARTNERS_CHANGED_EVENT, handler);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = handler;
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(PARTNERS_CHANGED_EVENT, handler);
    channel?.close();
  };
}
