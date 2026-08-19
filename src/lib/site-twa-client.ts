"use client";

import { isStandaloneDisplayMode } from "@/lib/site-pwa";

export type TwaSettingsTarget = "notifications" | "location" | "app";

export type TwaClientConfig = {
  packageName: string | null;
  settingsDeepLinkSupported: boolean;
};

export function isAndroidDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

export function isAndroidStandalonePwa() {
  return isAndroidDevice() && isStandaloneDisplayMode();
}

export function resolveTwaPackageName(configPackageName: string | null | undefined) {
  const fromConfig = configPackageName?.trim();
  if (fromConfig && isValidAndroidPackageName(fromConfig)) {
    return fromConfig;
  }

  const fromEnv = process.env.NEXT_PUBLIC_TWA_ANDROID_PACKAGE_NAME?.trim();
  if (fromEnv && isValidAndroidPackageName(fromEnv)) {
    return fromEnv;
  }

  return null;
}

function isValidAndroidPackageName(value: string) {
  return /^[a-zA-Z][\w.]*$/.test(value);
}

export function canOpenAndroidSystemSettings(
  config: TwaClientConfig | null | undefined,
) {
  const packageName = resolveTwaPackageName(config?.packageName ?? null);
  return Boolean(packageName && isAndroidStandalonePwa());
}

export function buildAndroidSettingsIntentUrl(
  packageName: string,
  target: TwaSettingsTarget,
) {
  const pkg = packageName.trim();
  if (!isValidAndroidPackageName(pkg)) {
    return null;
  }

  if (target === "notifications") {
    return `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=${pkg};end`;
  }

  return `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${pkg};end`;
}

export function openAndroidSystemSettings(
  packageName: string,
  target: TwaSettingsTarget,
) {
  if (typeof window === "undefined") {
    return false;
  }

  const url = buildAndroidSettingsIntentUrl(packageName, target);
  if (!url) {
    return false;
  }

  window.location.assign(url);
  return true;
}

export function mapPermissionKindToTwaSettingsTarget(
  kind: "notification" | "location",
): TwaSettingsTarget {
  return kind === "notification" ? "notifications" : "location";
}
