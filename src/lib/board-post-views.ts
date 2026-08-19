const STORAGE_KEY = "board-post-viewed-ids";

function readViewedIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeViewedIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function hasViewedBoardPost(postId: string) {
  return readViewedIds().includes(postId);
}

export function markBoardPostViewed(postId: string) {
  const ids = readViewedIds();
  if (ids.includes(postId)) {
    return;
  }

  writeViewedIds([...ids, postId]);
}
