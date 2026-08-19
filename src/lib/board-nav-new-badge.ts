import { isNewBoardPost } from "@/lib/board-list-format";

const STORAGE_KEY = "board-nav-last-seen-at";
export const BOARD_NAV_VISITED_EVENT = "board-nav-visited";

export function getBoardNavLastSeenAt(): number | null {
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

export function markBoardNavSeen(at = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    // ignore quota / private mode
  }
}

export function dispatchBoardNavVisited() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(BOARD_NAV_VISITED_EVENT));
}

export function hasUnreadBoardNavPosts(latestCreatedAt: string | null | undefined): boolean {
  if (!latestCreatedAt) {
    return false;
  }

  const latestMs = new Date(latestCreatedAt).getTime();
  if (!Number.isFinite(latestMs)) {
    return false;
  }

  const lastSeenAt = getBoardNavLastSeenAt();
  if (lastSeenAt == null) {
    return isNewBoardPost(latestCreatedAt);
  }

  return latestMs > lastSeenAt;
}
