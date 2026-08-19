import { getBoardVoterKey } from "@/lib/board-voter";

export function getPartnerVoterKey(): string {
  return getBoardVoterKey();
}

export function getStoredPartnerReaction(partnerId: string): "like" | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`partner-reaction:${partnerId}`);
  return raw === "like" ? "like" : null;
}

export function setStoredPartnerReaction(partnerId: string, reaction: "like" | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = `partner-reaction:${partnerId}`;
  if (reaction) {
    window.localStorage.setItem(key, reaction);
  } else {
    window.localStorage.removeItem(key);
  }
}
