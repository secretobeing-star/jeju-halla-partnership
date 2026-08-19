/**
 * Browser device-local storage helpers.
 * Data stays in this browser profile only — not synced to Supabase.
 */

export const DEVICE_VOTER_KEY = "board-voter-key";
export const DEVICE_PARTNER_FAVORITES_KEY = "jeju-halla-partner-favorites";
export const DEVICE_USER_BETA_SETTINGS_KEY = "jeju-halla-user-beta-settings";

export function isDeviceStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readDeviceRaw(key: string): string | null {
  if (!isDeviceStorageAvailable()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeDeviceRaw(key: string, value: string): void {
  if (!isDeviceStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or private mode — ignore.
  }
}

export function removeDeviceRaw(key: string): void {
  if (!isDeviceStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readDeviceJson<T>(key: string, fallback: T): T {
  const raw = readDeviceRaw(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeDeviceJson(key: string, value: unknown): void {
  writeDeviceRaw(key, JSON.stringify(value));
}

export { getBoardVoterKey as getDeviceKey } from "@/lib/board-voter";
