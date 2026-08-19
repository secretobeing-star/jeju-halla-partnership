"use client";

import { useEffect } from "react";
import {
  appendPwaAssetVersion,
  buildAdminPwaManifestVersion,
  isAdminPwaEnabled,
  resolveAdminPwaBackgroundColor,
  resolveAdminPwaChromeTabThemeColor,
  resolveAdminPwaIconUrl,
  resolveAdminPwaName,
  resolveAdminPwaShortName,
  resolveAdminPwaTaskbarThemeColor,
  resolvePwaIconMimeType,
  type SiteAdminPwaSettingsSource,
} from "@/lib/site-admin-pwa";

type AdminPwaHeadLinksProps = {
  settings: SiteAdminPwaSettingsSource | null;
};

const ADMIN_MANIFEST_MARKER = "data-admin-pwa-manifest";

/**
 * /admin 에서 공개 PWA manifest 를 관리자용으로 교체합니다.
 * 루트 layout 의 SitePwaHeadLinks 가 먼저 렌더되므로 클라이언트에서 swap 합니다.
 */
export default function AdminPwaHeadLinks({ settings }: AdminPwaHeadLinksProps) {
  useEffect(() => {
    if (!isAdminPwaEnabled(settings)) {
      document.querySelectorAll(`link[${ADMIN_MANIFEST_MARKER}]`).forEach((node) => node.remove());
      return;
    }

    const backgroundColor = resolveAdminPwaBackgroundColor(settings);
    const chromeTabThemeColor = resolveAdminPwaChromeTabThemeColor(settings);
    const taskbarThemeColor = resolveAdminPwaTaskbarThemeColor(settings);
    const appName = resolveAdminPwaName(settings);
    const shortName = resolveAdminPwaShortName(settings);
    const manifestVersion = buildAdminPwaManifestVersion(settings);
    const manifestHref = `/manifest-admin.webmanifest?v=${manifestVersion}`;
    const iconUrl = resolveAdminPwaIconUrl(settings);
    const versionedIconUrl = iconUrl ? appendPwaAssetVersion(iconUrl, manifestVersion) : null;
    const iconMimeType = versionedIconUrl ? resolvePwaIconMimeType(versionedIconUrl) : "image/png";

    document.querySelectorAll('link[rel="manifest"]').forEach((node) => {
      const href = node.getAttribute("href") ?? "";
      if (href.includes("manifest-admin.webmanifest")) {
        return;
      }
      if (href.includes("manifest.webmanifest") || href.includes("manifest.json")) {
        node.remove();
      }
    });

    let manifestLink = document.querySelector(
      `link[rel="manifest"][${ADMIN_MANIFEST_MARKER}]`,
    ) as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.setAttribute(ADMIN_MANIFEST_MARKER, "1");
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestHref;

    function upsertMeta(name: string, content: string) {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    }

    upsertMeta("application-name", shortName);
    upsertMeta("mobile-web-app-capable", "yes");
    upsertMeta("theme-color", chromeTabThemeColor);
    upsertMeta("navigation-bar-color", taskbarThemeColor);
    upsertMeta("msapplication-TileColor", backgroundColor);
    upsertMeta("apple-mobile-web-app-capable", "yes");
    upsertMeta("apple-mobile-web-app-title", appName);

    if (versionedIconUrl) {
      document
        .querySelectorAll(`link[${ADMIN_MANIFEST_MARKER}-icon]`)
        .forEach((node) => node.remove());

      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.sizes = "180x180";
      apple.href = versionedIconUrl;
      apple.setAttribute(`${ADMIN_MANIFEST_MARKER}-icon`, "1");
      document.head.appendChild(apple);

      for (const sizes of ["192x192", "512x512"] as const) {
        const icon = document.createElement("link");
        icon.rel = "icon";
        icon.type = iconMimeType;
        icon.sizes = sizes;
        icon.href = versionedIconUrl;
        icon.setAttribute(`${ADMIN_MANIFEST_MARKER}-icon`, "1");
        document.head.appendChild(icon);
      }
    }
  }, [settings]);

  return null;
}
