import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "halla-public-reload-at";
const CHANNEL_NAME = "halla-public-reload";
const NOTIFY_DEBOUNCE_MS = 500;
const RELOAD_DEBOUNCE_MS = 800;
const POLL_MS = 4000;

let notifyTimer: number | null = null;

async function publishReloadStamp(stamp: string) {
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

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/public-reload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore
  }
}

export function notifyPublicSiteReload() {
  if (typeof window === "undefined") return;
  if (notifyTimer != null) {
    window.clearTimeout(notifyTimer);
  }
  notifyTimer = window.setTimeout(() => {
    notifyTimer = null;
    void publishReloadStamp(String(Date.now()));
  }, NOTIFY_DEBOUNCE_MS);
}

export function subscribePublicSiteReload(onReload: () => void) {
  if (typeof window === "undefined") return () => {};
  if (window.location.pathname.startsWith("/admin")) return () => {};

  let reloadTimer: number | null = null;
  let lastServerAt = 0;
  let lastBuild = "";
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

  const poll = async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const response = await fetch(`/api/public-reload?t=${Date.now()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        at?: number;
        build?: string;
      };
      const at = Number(payload.at) || 0;
      const build = String(payload.build ?? "").trim();
      if (build) {
        if (!lastBuild) {
          lastBuild = build;
        } else if (build !== lastBuild) {
          lastBuild = build;
          lastServerAt = at || lastServerAt;
          scheduleReload();
          return;
        }
      }
      if (!lastServerAt) {
        lastServerAt = at;
        return;
      }
      if (at > lastServerAt) {
        lastServerAt = at;
        scheduleReload();
      }
    } catch {
      // ignore
    }
  };

  void poll();
  const pollTimer = window.setInterval(() => void poll(), POLL_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      void poll();
    }
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    if (reloadTimer != null) {
      window.clearTimeout(reloadTimer);
    }
    window.clearInterval(pollTimer);
    channel?.close();
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
