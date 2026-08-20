import { DEFAULT_SITE_SETTINGS } from "@/lib/default-site-settings";
import { normalizeBoardColor } from "@/lib/board-definitions";
import { normalizeMainDomain } from "@/lib/site-domain";

export const DEFAULT_PWA_THEME_COLOR = "#ffffff";
export const DEFAULT_PWA_BACKGROUND_COLOR = "#ffffff";
export const DEFAULT_PWA_INSTALL_BUTTON_LABEL = "설치하기";
export const PWA_INSTALL_DISMISS_STORAGE_KEY = "site-pwa-install-dismissed-v4";
export const PWA_OPEN_DISMISS_STORAGE_KEY = "site-pwa-open-dismissed-v2";
export const PWA_INSTALLED_STORAGE_KEY = "site-pwa-installed-v1";
/** User-facing PWA release version (shown in app settings). */
export const PWA_APP_VERSION = "1.3.3";
/** Bump only when a fresh Android WebAPK mint is required (e.g. Play Protect cache). */
export const PWA_MANIFEST_ID = "/?pwa=1.3.3";

export type SitePwaSettingsSource = {
  site_pwa_enabled?: boolean;
  site_pwa_name?: string | null;
  site_pwa_short_name?: string | null;
  site_pwa_icon_url?: string | null;
  site_pwa_theme_color?: string | null;
  site_pwa_chrome_tab_theme_color?: string | null;
  site_pwa_taskbar_theme_color?: string | null;
  site_pwa_background_color?: string | null;
  site_pwa_install_prompt_enabled?: boolean;
  site_pwa_install_guide_message?: string | null;
  site_pwa_install_guide_steps?: string | null;
  site_pwa_install_button_label?: string | null;
  site_pwa_open_button_label?: string | null;
  site_pwa_loading_enabled?: boolean;
  site_pwa_loading_message?: string | null;
  site_pwa_loading_image_url?: string | null;
  site_pwa_loading_image_url_fold_cover?: string | null;
  site_pwa_loading_image_url_tablet?: string | null;
  site_pwa_loading_image_url_tablet_ultra?: string | null;
  site_pwa_loading_duration_ms?: number | null;
  site_pwa_loading_image_fullscreen?: boolean;
  site_pwa_first_run_notification_prompt_enabled?: boolean;
  site_pwa_first_run_location_prompt_enabled?: boolean;
  site_pwa_app_settings_enabled?: boolean;
  site_pwa_app_settings_notification_enabled?: boolean;
  site_pwa_app_settings_location_enabled?: boolean;
  site_favicon_url?: string | null;
  site_nav_brand_icon_url?: string | null;
  site_title?: string | null;
  header_title?: string | null;
  link_preview_title?: string | null;
  main_domain?: string | null;
};

export function resolvePwaName(settings: SitePwaSettingsSource | null | undefined) {
  return (
    settings?.site_pwa_name?.trim() ||
    settings?.link_preview_title?.trim() ||
    settings?.site_title?.trim() ||
    settings?.header_title?.trim() ||
    DEFAULT_SITE_SETTINGS.header_title
  );
}

export function resolvePwaShortName(settings: SitePwaSettingsSource | null | undefined) {
  const shortName = settings?.site_pwa_short_name?.trim();
  if (shortName) {
    return shortName.slice(0, 12);
  }

  const name = resolvePwaName(settings);
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

export function resolvePwaIconUrl(settings: SitePwaSettingsSource | null | undefined) {
  return (
    settings?.site_pwa_icon_url?.trim() ||
    settings?.site_favicon_url?.trim() ||
    settings?.site_nav_brand_icon_url?.trim() ||
    null
  );
}

export function resolvePwaChromeTabThemeColor(settings: SitePwaSettingsSource | null | undefined) {
  return (
    normalizeBoardColor(settings?.site_pwa_chrome_tab_theme_color) ??
    normalizeBoardColor(settings?.site_pwa_theme_color) ??
    DEFAULT_PWA_THEME_COLOR
  );
}

export function resolvePwaTaskbarThemeColor(settings: SitePwaSettingsSource | null | undefined) {
  return (
    normalizeBoardColor(settings?.site_pwa_taskbar_theme_color) ??
    resolvePwaChromeTabThemeColor(settings)
  );
}

/** @deprecated use resolvePwaTaskbarThemeColor — manifest·하위 호환 */
export function resolvePwaThemeColor(settings: SitePwaSettingsSource | null | undefined) {
  return resolvePwaTaskbarThemeColor(settings);
}

export function resolvePwaBackgroundColor(settings: SitePwaSettingsSource | null | undefined) {
  return normalizeBoardColor(settings?.site_pwa_background_color) ?? DEFAULT_PWA_BACKGROUND_COLOR;
}

export function buildPwaManifestVersion(settings: SitePwaSettingsSource | null | undefined) {
  const raw = [
    PWA_APP_VERSION,
    resolvePwaName(settings),
    resolvePwaShortName(settings),
    resolvePwaIconUrl(settings) ?? "",
    resolvePwaChromeTabThemeColor(settings),
    resolvePwaTaskbarThemeColor(settings),
    resolvePwaBackgroundColor(settings),
  ].join("|");

  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function appendPwaAssetVersion(url: string, version: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}mv=${encodeURIComponent(version)}`;
}

export function resolvePwaIconMimeType(url: string) {
  const normalized = url.toLowerCase();
  if (normalized.includes(".webp")) {
    return "image/webp";
  }
  if (normalized.includes(".jpg") || normalized.includes(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.includes(".svg")) {
    return "image/svg+xml";
  }
  return "image/png";
}

export function resolvePwaStartUrl(settings: SitePwaSettingsSource | null | undefined) {
  const origin = normalizeMainDomain(settings?.main_domain);
  return origin ? `${origin}/` : "/";
}

export function resolvePwaScope(settings: SitePwaSettingsSource | null | undefined) {
  return resolvePwaStartUrl(settings);
}

function buildPwaManifestIcons(
  versionedIconUrl: string | null,
  iconMimeType: string,
  startUrl: string,
) {
  if (versionedIconUrl) {
    const iconSizes = ["144x144", "192x192", "384x384", "512x512"] as const;
    const anyIcons = iconSizes.map((sizes) => ({
      src: versionedIconUrl,
      sizes,
      type: iconMimeType,
      purpose: "any" as const,
    }));

    return [
      ...anyIcons,
      {
        src: versionedIconUrl,
        sizes: "512x512",
        type: iconMimeType,
        purpose: "maskable" as const,
      },
    ];
  }

  const faviconUrl = startUrl.startsWith("http") ? `${startUrl.replace(/\/+$/, "")}/favicon.ico` : "/favicon.ico";

  return [
    { src: faviconUrl, sizes: "48x48", type: "image/x-icon", purpose: "any" as const },
    { src: faviconUrl, sizes: "192x192", type: "image/x-icon", purpose: "any" as const },
    { src: faviconUrl, sizes: "512x512", type: "image/x-icon", purpose: "any" as const },
  ];
}

export function buildPwaManifest(settings: SitePwaSettingsSource | null | undefined) {
  const iconUrl = resolvePwaIconUrl(settings);
  const startUrl = resolvePwaStartUrl(settings);
  const scope = resolvePwaScope(settings);
  const manifestVersion = buildPwaManifestVersion(settings);
  const versionedIconUrl = iconUrl ? appendPwaAssetVersion(iconUrl, manifestVersion) : null;
  const iconMimeType = versionedIconUrl ? resolvePwaIconMimeType(versionedIconUrl) : "image/png";
  const name = resolvePwaName(settings);
  const shortName = resolvePwaShortName(settings);
  const themeColor = resolvePwaTaskbarThemeColor(settings);
  const backgroundColor = resolvePwaBackgroundColor(settings);

  return {
    id: PWA_MANIFEST_ID,
    name,
    short_name: shortName,
    description: `${name} — 홈 화면에 추가해 앱처럼 사용할 수 있습니다.`,
    start_url: startUrl,
    scope,
    display: "standalone" as const,
    display_override: ["standalone", "window-controls-overlay", "minimal-ui"] as const,
    background_color: backgroundColor,
    theme_color: themeColor,
    lang: "ko",
    dir: "ltr" as const,
    prefer_related_applications: false,
    related_applications: [] as [],
    categories: ["utilities", "productivity"],
    launch_handler: {
      client_mode: "navigate-existing" as const,
    },
    handle_links: "preferred" as const,
    icons: buildPwaManifestIcons(versionedIconUrl, iconMimeType, startUrl),
  };
}

export function isPwaEnabled(settings: SitePwaSettingsSource | null | undefined) {
  return settings?.site_pwa_enabled ?? false;
}

export function isAndroidTwaDisplayContext() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.referrer.startsWith("android-app://");
}

export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    isAndroidTwaDisplayContext()
  ) {
    return true;
  }

  return false;
}

export function isPwaStandaloneDesktopLayout(
  settings: SitePwaSettingsSource | null | undefined,
  options?: { standalone?: boolean; isMobileDevice?: boolean },
) {
  const standalone = options?.standalone ?? isStandaloneDisplayMode();
  const mobile =
    options?.isMobileDevice ??
    (typeof window !== "undefined" ? isMobileDevice() : false);

  return isPwaEnabled(settings) && standalone && !mobile;
}

export function isMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|SamsungBrowser/i.test(ua)) {
    return true;
  }

  if (typeof window !== "undefined") {
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      return true;
    }

    if (window.matchMedia("(max-width: 1279px)").matches) {
      return true;
    }
  }

  return false;
}

export function parsePwaInstallGuideSteps(raw: string | null | undefined) {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function resolvePwaInstallGuideMessage(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return settings?.site_pwa_install_guide_message?.trim() || null;
}

export function resolvePwaInstallGuideSteps(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return parsePwaInstallGuideSteps(settings?.site_pwa_install_guide_steps);
}

export function resolvePwaInstallButtonLabel(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return settings?.site_pwa_install_button_label?.trim() || DEFAULT_PWA_INSTALL_BUTTON_LABEL;
}

export function resolvePwaOpenButtonLabel(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return settings?.site_pwa_open_button_label?.trim() || null;
}

export function resolvePwaEffectiveOpenButtonLabel(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return resolvePwaOpenButtonLabel(settings) || resolvePwaInstallButtonLabel(settings);
}

export function isPwaFirstRunNotificationPromptEnabled(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return (
    isPwaEnabled(settings) &&
    (settings?.site_pwa_first_run_notification_prompt_enabled ?? true)
  );
}

export function isPwaFirstRunLocationPromptEnabled(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return (
    isPwaEnabled(settings) &&
    (settings?.site_pwa_first_run_location_prompt_enabled ?? true)
  );
}

export function isPwaAppSettingsEnabled(settings: SitePwaSettingsSource | null | undefined) {
  return isPwaEnabled(settings) && (settings?.site_pwa_app_settings_enabled ?? true);
}

export function isPwaAppSettingsNotificationEnabled(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return (
    isPwaAppSettingsEnabled(settings) &&
    (settings?.site_pwa_app_settings_notification_enabled ?? true)
  );
}

export function isPwaAppSettingsLocationEnabled(
  settings: SitePwaSettingsSource | null | undefined,
) {
  return (
    isPwaAppSettingsEnabled(settings) &&
    (settings?.site_pwa_app_settings_location_enabled ?? true)
  );
}

export type SitePwaAppDisplaySettingsSource = SitePwaSettingsSource & {
  dark_mode_enabled?: boolean;
  main_font_size_enabled?: boolean;
  page_background_enabled?: boolean;
  page_background_default_enabled?: boolean;
  partner_category_section_enabled?: boolean;
  main_category_region_user_toggle_enabled?: boolean;
};

export function isPwaAppSettingsDarkModeEnabled(
  settings: SitePwaAppDisplaySettingsSource | null | undefined,
) {
  return isPwaAppSettingsEnabled(settings) && (settings?.dark_mode_enabled ?? false);
}

export function isPwaAppSettingsFontSizeEnabled(
  settings: SitePwaAppDisplaySettingsSource | null | undefined,
) {
  return isPwaAppSettingsEnabled(settings) && (settings?.main_font_size_enabled ?? false);
}

export function isPwaAppSettingsCategoryRegionEnabled(
  settings: SitePwaAppDisplaySettingsSource | null | undefined,
) {
  return (
    isPwaAppSettingsEnabled(settings) &&
    (settings?.partner_category_section_enabled ?? true) &&
    (settings?.main_category_region_user_toggle_enabled ?? true)
  );
}

export function isPwaAppSettingsPageBackgroundEnabled(
  settings: SitePwaAppDisplaySettingsSource | null | undefined,
) {
  return isPwaAppSettingsEnabled(settings) && (settings?.page_background_enabled ?? false);
}

export function hasPwaAppSettingsPanelContent(
  settings: SitePwaAppDisplaySettingsSource | null | undefined,
) {
  if (!isPwaAppSettingsEnabled(settings)) {
    return false;
  }

  return (
    isPwaAppSettingsLocationEnabled(settings) ||
    isPwaAppSettingsNotificationEnabled(settings) ||
    isPwaAppSettingsDarkModeEnabled(settings) ||
    isPwaAppSettingsFontSizeEnabled(settings) ||
    isPwaAppSettingsPageBackgroundEnabled(settings) ||
    isPwaAppSettingsCategoryRegionEnabled(settings)
  );
}