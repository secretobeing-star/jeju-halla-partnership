const STORAGE_KEY = "board-voter-key";

export function getBoardVoterKey(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 8) {
    return existing;
  }

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}

export function getStoredPostReaction(postId: string): "like" | "dislike" | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`board-reaction:${postId}`);
  return raw === "like" || raw === "dislike" ? raw : null;
}

export function setStoredPostReaction(
  postId: string,
  reaction: "like" | "dislike" | null,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = `board-reaction:${postId}`;
  if (reaction) {
    window.localStorage.setItem(key, reaction);
  } else {
    window.localStorage.removeItem(key);
  }
}
