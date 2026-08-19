"use client";

import { isAndroidDevice } from "@/lib/site-twa-client";

export type PwaPermissionPlatform = "android" | "ios" | "other";

export function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function resolvePwaPermissionPlatform(): PwaPermissionPlatform {
  if (isAndroidDevice()) {
    return "android";
  }

  if (isIosDevice()) {
    return "ios";
  }

  return "other";
}
