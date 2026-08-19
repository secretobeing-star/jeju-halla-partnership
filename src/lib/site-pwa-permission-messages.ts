import type { SitePwaSettingsSource } from "@/lib/site-pwa";
import type { PermissionDisplayState } from "@/lib/site-pwa-permissions";
import {
  resolvePwaPermissionPlatform,
  type PwaPermissionPlatform,
} from "@/lib/site-pwa-platform";

export type SitePwaPermissionMessagesSource = SitePwaSettingsSource & {
  site_pwa_permission_notification_request_title?: string | null;
  site_pwa_permission_notification_request_message?: string | null;
  site_pwa_permission_notification_denied_title?: string | null;
  site_pwa_permission_notification_denied_message?: string | null;
  site_pwa_permission_location_request_title?: string | null;
  site_pwa_permission_location_request_message?: string | null;
  site_pwa_permission_location_denied_title?: string | null;
  site_pwa_permission_location_denied_message?: string | null;
  site_pwa_permission_app_notification_denied_message?: string | null;
  site_pwa_permission_app_location_denied_message?: string | null;
  site_pwa_permission_notification_request_title_ios?: string | null;
  site_pwa_permission_notification_request_message_ios?: string | null;
  site_pwa_permission_notification_denied_title_ios?: string | null;
  site_pwa_permission_notification_denied_message_ios?: string | null;
  site_pwa_permission_location_request_title_ios?: string | null;
  site_pwa_permission_location_request_message_ios?: string | null;
  site_pwa_permission_location_denied_title_ios?: string | null;
  site_pwa_permission_location_denied_message_ios?: string | null;
  site_pwa_permission_app_notification_denied_message_ios?: string | null;
  site_pwa_permission_app_location_denied_message_ios?: string | null;
};

export type PwaPermissionPromptKind = "notification" | "location";
export type PwaPermissionPromptVariant = "request" | "denied";

export type PwaFirstRunPromptContent = {
  variant: PwaPermissionPromptVariant;
  title: string | null;
  message: string | null;
};

function trimText(value: string | null | undefined) {
  return value?.trim() || null;
}

function readPlatformText(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  platform: PwaPermissionPlatform,
  androidKey: keyof SitePwaPermissionMessagesSource,
  iosKey: keyof SitePwaPermissionMessagesSource,
) {
  if (platform === "android") {
    return trimText(settings?.[androidKey] as string | null | undefined);
  }

  if (platform === "ios") {
    return trimText(settings?.[iosKey] as string | null | undefined);
  }

  return null;
}

export function resolvePwaPermissionPlatformForMessages(): PwaPermissionPlatform {
  return resolvePwaPermissionPlatform();
}

export function resolvePwaPermissionPromptTitle(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  kind: PwaPermissionPromptKind,
  variant: PwaPermissionPromptVariant,
  platform: PwaPermissionPlatform = resolvePwaPermissionPlatform(),
) {
  if (kind === "notification") {
    return variant === "denied"
      ? readPlatformText(
          settings,
          platform,
          "site_pwa_permission_notification_denied_title",
          "site_pwa_permission_notification_denied_title_ios",
        )
      : readPlatformText(
          settings,
          platform,
          "site_pwa_permission_notification_request_title",
          "site_pwa_permission_notification_request_title_ios",
        );
  }

  return variant === "denied"
    ? readPlatformText(
        settings,
        platform,
        "site_pwa_permission_location_denied_title",
        "site_pwa_permission_location_denied_title_ios",
      )
    : readPlatformText(
        settings,
        platform,
        "site_pwa_permission_location_request_title",
        "site_pwa_permission_location_request_title_ios",
      );
}

export function resolvePwaPermissionPromptMessage(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  kind: PwaPermissionPromptKind,
  variant: PwaPermissionPromptVariant,
  platform: PwaPermissionPlatform = resolvePwaPermissionPlatform(),
) {
  if (kind === "notification") {
    return variant === "denied"
      ? readPlatformText(
          settings,
          platform,
          "site_pwa_permission_notification_denied_message",
          "site_pwa_permission_notification_denied_message_ios",
        )
      : readPlatformText(
          settings,
          platform,
          "site_pwa_permission_notification_request_message",
          "site_pwa_permission_notification_request_message_ios",
        );
  }

  return variant === "denied"
    ? readPlatformText(
        settings,
        platform,
        "site_pwa_permission_location_denied_message",
        "site_pwa_permission_location_denied_message_ios",
      )
    : readPlatformText(
        settings,
        platform,
        "site_pwa_permission_location_request_message",
        "site_pwa_permission_location_request_message_ios",
      );
}

export function resolvePwaFirstRunPromptContent(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  kind: PwaPermissionPromptKind,
  permissionState: PermissionDisplayState,
  platform: PwaPermissionPlatform = resolvePwaPermissionPlatform(),
): PwaFirstRunPromptContent | null {
  if (platform === "other" || permissionState === "unsupported") {
    return null;
  }

  const variants: PwaPermissionPromptVariant[] =
    permissionState === "denied" ? ["denied", "request"] : ["request", "denied"];

  for (const variant of variants) {
    const title = resolvePwaPermissionPromptTitle(settings, kind, variant, platform);
    const message = resolvePwaPermissionPromptMessage(settings, kind, variant, platform);
    if (title || message) {
      return { variant, title, message };
    }
  }

  return null;
}

export function hasPwaPermissionFirstRunCopyForState(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  kind: PwaPermissionPromptKind,
  permissionState: PermissionDisplayState,
  platform: PwaPermissionPlatform = resolvePwaPermissionPlatform(),
) {
  return resolvePwaFirstRunPromptContent(settings, kind, permissionState, platform) != null;
}

export function hasPwaPermissionFirstRunCopy(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  kind: PwaPermissionPromptKind,
  variant: PwaPermissionPromptVariant,
  platform: PwaPermissionPlatform = resolvePwaPermissionPlatform(),
) {
  if (platform === "other") {
    return false;
  }

  return Boolean(
    resolvePwaPermissionPromptTitle(settings, kind, variant, platform) ||
      resolvePwaPermissionPromptMessage(settings, kind, variant, platform),
  );
}

export function getPwaPermissionFirstRunCopyFingerprint(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  platform: PwaPermissionPlatform = resolvePwaPermissionPlatform(),
) {
  if (platform === "other") {
    return "other";
  }

  const parts: Array<string | null> = [];

  for (const kind of ["notification", "location"] as const) {
    for (const variant of ["request", "denied"] as const) {
      parts.push(resolvePwaPermissionPromptTitle(settings, kind, variant, platform));
      parts.push(resolvePwaPermissionPromptMessage(settings, kind, variant, platform));
    }
  }

  return parts.join("\0");
}

export function resolvePwaPermissionAppSettingsDeniedMessage(
  settings: SitePwaPermissionMessagesSource | null | undefined,
  kind: PwaPermissionPromptKind,
  platform: PwaPermissionPlatform = resolvePwaPermissionPlatform(),
) {
  if (kind === "notification") {
    return readPlatformText(
      settings,
      platform,
      "site_pwa_permission_app_notification_denied_message",
      "site_pwa_permission_app_notification_denied_message_ios",
    );
  }

  return readPlatformText(
    settings,
    platform,
    "site_pwa_permission_app_location_denied_message",
    "site_pwa_permission_app_location_denied_message_ios",
  );
}
