"use client";

import { getPwaDeviceKey } from "@/lib/site-pwa-device";
import { getCurrentGeolocation } from "@/lib/geolocation";
import {
  getSitePushSubscription,
  isSitePushSubscribed,
  subscribeSitePushWithPermissionGranted,
  unsubscribeSitePush,
} from "@/lib/site-push-client";

export type PermissionDisplayState = "unsupported" | "prompt" | "granted" | "denied";

export const PWA_FIRST_RUN_NOTIFICATION_KEY = "site-pwa-first-run-notification-v6";
export const PWA_FIRST_RUN_LOCATION_KEY = "site-pwa-first-run-location-v6";
export const PWA_LOCATION_ACCESS_DISABLED_KEY = "site-pwa-location-access-disabled-v1";

function readStorageRaw(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageRaw(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function clearStorageFlag(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function readStorageFlag(key: string) {
  return readStorageRaw(key) === "1";
}

function writeStorageFlag(key: string) {
  writeStorageRaw(key, "1");
}

function resolveDevicePromptKey(deviceKey?: string | null) {
  const resolved = deviceKey?.trim() || getPwaDeviceKey().trim();
  return resolved.length >= 8 ? resolved : null;
}

function hasDeviceBoundFirstRunPrompted(key: string, deviceKey?: string | null) {
  const activeDeviceKey = resolveDevicePromptKey(deviceKey);
  if (!activeDeviceKey) {
    return false;
  }

  const stored = readStorageRaw(key)?.trim();
  return stored != null && stored.length >= 8 && stored === activeDeviceKey;
}

function markDeviceBoundFirstRunPrompted(key: string, deviceKey?: string | null) {
  const activeDeviceKey = resolveDevicePromptKey(deviceKey);
  if (!activeDeviceKey) {
    return;
  }

  writeStorageRaw(key, activeDeviceKey);
}

export function hasPwaFirstRunNotificationPrompted(deviceKey?: string | null) {
  return hasDeviceBoundFirstRunPrompted(PWA_FIRST_RUN_NOTIFICATION_KEY, deviceKey);
}

export function markPwaFirstRunNotificationPrompted(deviceKey?: string | null) {
  markDeviceBoundFirstRunPrompted(PWA_FIRST_RUN_NOTIFICATION_KEY, deviceKey);
}

export function hasPwaFirstRunLocationPrompted(deviceKey?: string | null) {
  return hasDeviceBoundFirstRunPrompted(PWA_FIRST_RUN_LOCATION_KEY, deviceKey);
}

export function markPwaFirstRunLocationPrompted(deviceKey?: string | null) {
  markDeviceBoundFirstRunPrompted(PWA_FIRST_RUN_LOCATION_KEY, deviceKey);
}

export function getNotificationPermissionState(): PermissionDisplayState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return "prompt";
}

export async function queryGeolocationPermissionState(): Promise<PermissionDisplayState> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "unsupported";
  }

  if (!navigator.permissions?.query) {
    return "prompt";
  }

  try {
    const result = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    if (result.state === "granted" || result.state === "denied" || result.state === "prompt") {
      return result.state;
    }
  } catch {
    // Safari/iOS may not support Permissions API for geolocation.
  }

  return "prompt";
}

export function formatPermissionStateLabel(state: PermissionDisplayState) {
  switch (state) {
    case "granted":
      return "허용됨";
    case "denied":
      return "거부됨";
    case "prompt":
      return "미설정";
    default:
      return "지원되지 않음";
  }
}

export function beginNotificationPermissionRequest() {
  if (typeof Notification === "undefined") {
    return Promise.reject(new Error("이 기기에서는 알림을 지원하지 않습니다."));
  }

  if (Notification.permission === "granted") {
    return Promise.resolve("granted" as NotificationPermission);
  }

  return Notification.requestPermission();
}

export async function completePwaNotificationAccess(
  clientKey: string,
  pushEnabled: boolean,
  permission: NotificationPermission,
) {
  if (permission !== "granted") {
    throw new Error("알림 권한이 거부되었습니다.");
  }

  if (!pushEnabled) {
    return { permission, subscribed: false };
  }

  await subscribeSitePushWithPermissionGranted(clientKey);
  return { permission, subscribed: true };
}

export async function requestPwaNotificationAccess(clientKey: string, pushEnabled: boolean) {
  const permission = await beginNotificationPermissionRequest();
  return completePwaNotificationAccess(clientKey, pushEnabled, permission);
}

export async function disablePwaNotificationAccess() {
  const existing = await getSitePushSubscription();
  await unsubscribeSitePush(existing);
}

export async function refreshPwaNotificationAccessState() {
  const permission = getNotificationPermissionState();
  if (permission !== "granted") {
    return { permission, subscribed: false };
  }

  const subscribed = await isSitePushSubscribed();
  return { permission, subscribed };
}

export async function syncPwaNotificationAccessAfterAppResume(
  clientKey: string,
  pushEnabled: boolean,
) {
  const permission = getNotificationPermissionState();
  if (permission !== "granted") {
    return { permission, subscribed: false, synced: false };
  }

  if (!pushEnabled) {
    return { permission, subscribed: true, synced: false };
  }

  const subscribed = await isSitePushSubscribed();
  if (subscribed) {
    return { permission, subscribed: true, synced: false };
  }

  try {
    await subscribeSitePushWithPermissionGranted(clientKey);
    return { permission, subscribed: true, synced: true };
  } catch {
    return { permission, subscribed: false, synced: false };
  }
}

export async function syncPwaLocationAccessAfterAppResume() {
  const permission = await queryGeolocationPermissionState();
  if (permission !== "granted") {
    return { permission, active: false, synced: false };
  }

  if (!isPwaLocationAccessDisabled()) {
    return { permission, active: true, synced: false };
  }

  clearStorageFlag(PWA_LOCATION_ACCESS_DISABLED_KEY);
  return { permission, active: true, synced: true };
}

export async function requestPwaLocationAccess() {
  clearStorageFlag(PWA_LOCATION_ACCESS_DISABLED_KEY);
  await getCurrentGeolocation({ maximumAge: 0, timeout: 12_000 });
  return queryGeolocationPermissionState();
}

export function isPwaLocationAccessDisabled() {
  return readStorageFlag(PWA_LOCATION_ACCESS_DISABLED_KEY);
}

export function setPwaLocationAccessDisabled(disabled: boolean) {
  if (disabled) {
    writeStorageFlag(PWA_LOCATION_ACCESS_DISABLED_KEY);
    return;
  }

  clearStorageFlag(PWA_LOCATION_ACCESS_DISABLED_KEY);
}

export async function refreshPwaLocationAccessState() {
  const permission = await queryGeolocationPermissionState();
  const active = permission === "granted" && !isPwaLocationAccessDisabled();
  return { permission, active };
}

export async function enablePwaLocationAccess() {
  setPwaLocationAccessDisabled(false);

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("이 기기에서는 위치를 지원하지 않습니다.");
  }

  await getCurrentGeolocation({ maximumAge: 0, timeout: 12_000 });
  return queryGeolocationPermissionState();
}

export async function disablePwaLocationAccess() {
  setPwaLocationAccessDisabled(true);
}
