import {
  DEVICE_PARTNER_FAVORITES_KEY,
  readDeviceJson,
  writeDeviceJson,
} from "@/lib/device-storage";
import { getLoggedInStudentId } from "@/lib/site-member-session";

export const PARTNER_FAVORITES_EVENT = "partner-favorites-changed";

function accountSyncedKey(userId: string) {
  return `${DEVICE_PARTNER_FAVORITES_KEY}-synced:${userId}`;
}

export function partnerFavoritesStorageKey(userId = getLoggedInStudentId()) {
  const id = userId.trim();
  return id ? `${DEVICE_PARTNER_FAVORITES_KEY}:${id}` : DEVICE_PARTNER_FAVORITES_KEY;
}

function parseFavoriteIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

export function loadPartnerFavoriteIds(): ReadonlySet<string> {
  return new Set(parseFavoriteIds(readDeviceJson<unknown>(partnerFavoritesStorageKey(), [])));
}

function savePartnerFavoriteIds(ids: ReadonlySet<string>) {
  writeDeviceJson(partnerFavoritesStorageKey(), [...ids]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PARTNER_FAVORITES_EVENT));
  }
}

export function isPartnerFavorite(partnerId: string): boolean {
  return loadPartnerFavoriteIds().has(partnerId);
}

/** @returns true if now favorited */
export function togglePartnerFavorite(partnerId: string): boolean {
  const ids = new Set(loadPartnerFavoriteIds());
  const nextFavorited = !ids.has(partnerId);

  if (nextFavorited) {
    ids.add(partnerId);
  } else {
    ids.delete(partnerId);
  }

  savePartnerFavoriteIds(ids);
  return nextFavorited;
}

export function replacePartnerFavoriteIds(ids: Iterable<string>) {
  savePartnerFavoriteIds(
    new Set([...ids].filter((id) => typeof id === "string" && id.trim().length > 0)),
  );
}

export function hasUploadedAccountFavorites(userId: string) {
  if (typeof window === "undefined" || !userId.trim()) {
    return false;
  }
  return window.localStorage.getItem(accountSyncedKey(userId.trim())) === "1";
}

export function markAccountFavoritesUploaded(userId: string) {
  if (typeof window === "undefined" || !userId.trim()) {
    return;
  }
  window.localStorage.setItem(accountSyncedKey(userId.trim()), "1");
}

export function loadGuestPartnerFavoriteIds(): string[] {
  return parseFavoriteIds(readDeviceJson<unknown>(DEVICE_PARTNER_FAVORITES_KEY, []));
}
