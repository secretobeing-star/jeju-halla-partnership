import { DEFAULT_SITE_SETTINGS } from "@/lib/default-site-settings";
import { normalizeMainDomain } from "@/lib/site-domain";
import {
  appendPwaAssetVersion,
  isStandaloneDisplayMode,
  resolvePwaBackgroundColor,
  resolvePwaChromeTabThemeColor,
  resolvePwaIconMimeType,
  resolvePwaTaskbarThemeColor,
  type SitePwaSettingsSource,
} from "@/lib/site-pwa";

export { appendPwaAssetVersion, resolvePwaIconMimeType } from "@/lib/site-pwa";

/** Minimum viewport width for the admin PWA (tablet / unfolded fold). */
export const ADMIN_PWA_MIN_VIEWPORT_WIDTH = 768;

export const DEFAULT_ADMIN_PWA_INSTALL_BUTTON_LABEL = "관리자 앱 설치";
export const ADMIN_PWA_INSTALL_DISMISS_STORAGE_KEY = "site-admin-pwa-install-dismissed-v1";
export const ADMIN_PWA_INSTALLED_STORAGE_KEY = "site-admin-pwa-installed-v1";

/** User-facing admin PWA release version. */
export const ADMIN_PWA_APP_VERSION = "1.0.0";
/** Bump when a fresh Android WebAPK mint is required for the admin app. */
export const ADMIN_PWA_MANIFEST_ID = "/admin?pwa-admin=1.0.0";

export type SiteAdminPwaSettingsSource = SitePwaSettingsSource & {
  site_admin_pwa_enabled?: boolean;
  site_admin_pwa_name?: string | null;
  site_admin_pwa_short_name?: string | null;
  site_admin_pwa_icon_url?: string | null;
  site_admin_pwa_install_prompt_enabled?: boolean;
  site_admin_pwa_install_guide_message?: string | null;
  site_admin_pwa_install_button_label?: string | null;
  admin_site_title?: string | null;
};

export function isAdminPwaEnabled(settings: SiteAdminPwaSettingsSource | null | undefined) {
  return settings?.site_admin_pwa_enabled ?? false;
}

export function resolveAdminPwaName(settings: SiteAdminPwaSettingsSource | null | undefined) {
  return (
    settings?.site_admin_pwa_name?.trim() ||
    (settings?.admin_site_title?.trim()
      ? settings.admin_site_title.trim()
      : null) ||
    `${settings?.header_title?.trim() || DEFAULT_SITE_SETTINGS.header_title} 관리자`
  );
}

export function resolveAdminPwaShortName(settings: SiteAdminPwaSettingsSource | null | undefined) {
  const shortName = settings?.site_admin_pwa_short_name?.trim();
  if (shortName) {
    return shortName.slice(0, 12);
  }

  const name = resolveAdminPwaName(settings);
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

export function resolveAdminPwaIconUrl(settings: SiteAdminPwaSettingsSource | null | undefined) {
  return (
    settings?.site_admin_pwa_icon_url?.trim() ||
    settings?.site_pwa_icon_url?.trim() ||
    settings?.site_favicon_url?.trim() ||
    settings?.site_nav_brand_icon_url?.trim() ||
    null
  );
}

export function resolveAdminPwaChromeTabThemeColor(
  settings: SiteAdminPwaSettingsSource | null | undefined,
) {
  return resolvePwaChromeTabThemeColor(settings);
}

export function resolveAdminPwaTaskbarThemeColor(
  settings: SiteAdminPwaSettingsSource | null | undefined,
) {
  return resolvePwaTaskbarThemeColor(settings);
}

export function resolveAdminPwaBackgroundColor(
  settings: SiteAdminPwaSettingsSource | null | undefined,
) {
  return resolvePwaBackgroundColor(settings);
}

export function resolveAdminPwaInstallGuideMessage(
  settings: SiteAdminPwaSettingsSource | null | undefined,
) {
  const message = settings?.site_admin_pwa_install_guide_message?.trim();
  if (message) {
    return message;
  }

  return `${resolveAdminPwaName(settings)} — 태블릿·폴드(768px 이상)에서 홈 화면에 추가해 관리자 앱으로 사용할 수 있습니다.`;
}

export function resolveAdminPwaInstallButtonLabel(
  settings: SiteAdminPwaSettingsSource | null | undefined,
) {
  return (
    settings?.site_admin_pwa_install_button_label?.trim() || DEFAULT_ADMIN_PWA_INSTALL_BUTTON_LABEL
  );
}

export function buildAdminPwaManifestVersion(
  settings: SiteAdminPwaSettingsSource | null | undefined,
) {
  const raw = [
    ADMIN_PWA_APP_VERSION,
    resolveAdminPwaName(settings),
    resolveAdminPwaShortName(settings),
    resolveAdminPwaIconUrl(settings) ?? "",
    resolveAdminPwaChromeTabThemeColor(settings),
    resolveAdminPwaTaskbarThemeColor(settings),
    resolveAdminPwaBackgroundColor(settings),
  ].join("|");

  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function resolveAdminPwaStartUrl(settings: SiteAdminPwaSettingsSource | null | undefined) {
  const origin = normalizeMainDomain(settings?.main_domain);
  return origin ? `${origin}/admin` : "/admin";
}

export function resolveAdminPwaScope(settings: SiteAdminPwaSettingsSource | null | undefined) {
  const origin = normalizeMainDomain(settings?.main_domain);
  return origin ? `${origin}/` : "/";
}

function buildAdminPwaManifestIcons(
  versionedIconUrl: string | null,
  iconMimeType: string,
  scopeUrl: string,
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

  const faviconUrl = scopeUrl.startsWith("http")
    ? `${scopeUrl.replace(/\/+$/, "")}/favicon.ico`
    : "/favicon.ico";

  return [
    { src: faviconUrl, sizes: "48x48", type: "image/x-icon", purpose: "any" as const },
    { src: faviconUrl, sizes: "192x192", type: "image/x-icon", purpose: "any" as const },
    { src: faviconUrl, sizes: "512x512", type: "image/x-icon", purpose: "any" as const },
  ];
}

export function buildAdminPwaManifest(settings: SiteAdminPwaSettingsSource | null | undefined) {
  const iconUrl = resolveAdminPwaIconUrl(settings);
  const startUrl = resolveAdminPwaStartUrl(settings);
  const scope = resolveAdminPwaScope(settings);
  const manifestVersion = buildAdminPwaManifestVersion(settings);
  const versionedIconUrl = iconUrl ? appendPwaAssetVersion(iconUrl, manifestVersion) : null;
  const iconMimeType = versionedIconUrl ? resolvePwaIconMimeType(versionedIconUrl) : "image/png";
  const name = resolveAdminPwaName(settings);
  const shortName = resolveAdminPwaShortName(settings);
  const themeColor = resolveAdminPwaTaskbarThemeColor(settings);
  const backgroundColor = resolveAdminPwaBackgroundColor(settings);

  return {
    id: ADMIN_PWA_MANIFEST_ID,
    name,
    short_name: shortName,
    description: `${name} — 태블릿·폴드에서 홈 화면에 추가해 관리자 앱으로 사용할 수 있습니다.`,
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
    categories: ["productivity", "utilities"],
    launch_handler: {
      client_mode: "navigate-existing" as const,
    },
    handle_links: "preferred" as const,
    icons: buildAdminPwaManifestIcons(versionedIconUrl, iconMimeType, scope),
  };
}

export function isAdminPwaTabletViewport(width?: number) {
  if (typeof width === "number") {
    return width >= ADMIN_PWA_MIN_VIEWPORT_WIDTH;
  }

  if (typeof window === "undefined") {
    return true;
  }

  return window.innerWidth >= ADMIN_PWA_MIN_VIEWPORT_WIDTH;
}

export function isAdminPwaStandaloneContext() {
  if (!isStandaloneDisplayMode()) {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
}

export function shouldBlockAdminPwaOnSmallViewport(width?: number) {
  return isAdminPwaStandaloneContext() && !isAdminPwaTabletViewport(width);
}
