import {
  DEVICE_PARTNER_FAVORITES_KEY,
  readDeviceJson,
  writeDeviceJson,
} from "@/lib/device-storage";

export const PARTNER_FAVORITES_EVENT = "partner-favorites-changed";

export function loadPartnerFavoriteIds(): ReadonlySet<string> {
  const parsed = readDeviceJson<unknown>(DEVICE_PARTNER_FAVORITES_KEY, []);
  if (!Array.isArray(parsed)) {
    return new Set();
  }

  return new Set(
    parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
  );
}

function savePartnerFavoriteIds(ids: ReadonlySet<string>) {
  writeDeviceJson(DEVICE_PARTNER_FAVORITES_KEY, [...ids]);

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
