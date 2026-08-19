const STORAGE_KEY = "site-events-nav-last-seen-at";
const NEW_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getSiteEventsNavLastSeenAt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function markSiteEventsNavSeen(at = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    // ignore quota / private mode
  }
}

function isRecentSiteEvent(createdAt: string, nowMs = Date.now()) {
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) {
    return false;
  }
  return nowMs - createdMs < NEW_EVENT_WINDOW_MS;
}

export function getLatestSiteEventCreatedAt(
  events: Array<{ created_at?: string | null }>,
): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;

  for (const event of events) {
    const createdAt = event.created_at?.trim();
    if (!createdAt) {
      continue;
    }
    const createdMs = Date.parse(createdAt);
    if (!Number.isFinite(createdMs) || createdMs <= latestMs) {
      continue;
    }
    latestMs = createdMs;
    latest = createdAt;
  }

  return latest;
}

export function hasUnreadSiteEvents(
  events: Array<{ created_at?: string | null }>,
  nowMs = Date.now(),
): boolean {
  const latestCreatedAt = getLatestSiteEventCreatedAt(events);
  if (!latestCreatedAt) {
    return false;
  }

  const latestMs = Date.parse(latestCreatedAt);
  if (!Number.isFinite(latestMs)) {
    return false;
  }

  const lastSeenAt = getSiteEventsNavLastSeenAt();
  if (lastSeenAt == null) {
    return isRecentSiteEvent(latestCreatedAt, nowMs);
  }

  return latestMs > lastSeenAt;
}
