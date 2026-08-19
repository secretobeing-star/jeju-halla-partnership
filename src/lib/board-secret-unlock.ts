const STORAGE_KEY = "board-secret-unlocked-ids";

export function getUnlockedSecretPostIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markSecretPostUnlocked(postId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const ids = getUnlockedSecretPostIds();
  ids.add(postId);
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function isSecretPostUnlocked(postId: string): boolean {
  return getUnlockedSecretPostIds().has(postId);
}
