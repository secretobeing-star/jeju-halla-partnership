"use client";

import { isStandaloneDisplayMode } from "@/lib/site-pwa";

export const PWA_DEVICE_KEY = "site-pwa-device-key-v1";

function createPwaDeviceKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `pwa-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * PWA-only device identity for first-run prompts.
 * Separate from board-voter-key so iOS Safari tabs and home-screen PWAs
 * do not share the same "already prompted" state.
 */
export function getPwaDeviceKey() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = window.localStorage.getItem(PWA_DEVICE_KEY)?.trim();
    if (existing && existing.length >= 8) {
      return existing;
    }

    if (!isStandaloneDisplayMode()) {
      return "";
    }

    const created = createPwaDeviceKey();
    window.localStorage.setItem(PWA_DEVICE_KEY, created);
    return created;
  } catch {
    return "";
  }
}
