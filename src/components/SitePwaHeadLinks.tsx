import {
  appendPwaAssetVersion,
  buildPwaManifestVersion,
  isPwaEnabled,
  resolvePwaBackgroundColor,
  resolvePwaChromeTabThemeColor,
  resolvePwaIconMimeType,
  resolvePwaIconUrl,
  resolvePwaName,
  resolvePwaShortName,
  resolvePwaTaskbarThemeColor,
  type SitePwaSettingsSource,
} from "@/lib/site-pwa";
import { getRequestPathname, isAdminRoutePathname } from "@/lib/request-pathname";

type SitePwaHeadLinksProps = {
  settings: SitePwaSettingsSource | null;
};

/**
 * Next.js layout <head> — index.html head 와 동일 역할.
 * PWA 설치·Android 14+ WebAPK mint 에 필요한 link/meta 를 서버에서 출력합니다.
 * /admin 에서는 관리자 PWA manifest 만 쓰도록 공개 manifest 를 생략합니다.
 */
export default async function SitePwaHeadLinks({ settings }: SitePwaHeadLinksProps) {
  const pathname = await getRequestPathname();
  if (isAdminRoutePathname(pathname)) {
    return null;
  }

  if (!isPwaEnabled(settings)) {
    return null;
  }

  const backgroundColor = resolvePwaBackgroundColor(settings);
  const chromeTabThemeColor = resolvePwaChromeTabThemeColor(settings);
  const taskbarThemeColor = resolvePwaTaskbarThemeColor(settings);
  const appName = resolvePwaName(settings);
  const shortName = resolvePwaShortName(settings);
  const manifestVersion = buildPwaManifestVersion(settings);
  const manifestHref = `/manifest.webmanifest?v=${manifestVersion}`;
  const iconUrl = resolvePwaIconUrl(settings);
  const versionedIconUrl = iconUrl ? appendPwaAssetVersion(iconUrl, manifestVersion) : null;
  const iconMimeType = versionedIconUrl ? resolvePwaIconMimeType(versionedIconUrl) : null;

  return (
    <>
      <link rel="manifest" href={manifestHref} />
      <meta name="application-name" content={shortName} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="theme-color" content={chromeTabThemeColor} />
      <meta name="navigation-bar-color" content={taskbarThemeColor} />
      <meta name="color-scheme" content="light only" />
      <meta name="msapplication-TileColor" content={backgroundColor} />
      <meta name="msapplication-tap-highlight" content="no" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={appName} />
      {versionedIconUrl ? (
        <>
          <link rel="apple-touch-icon" sizes="180x180" href={versionedIconUrl} />
          <link rel="icon" type={iconMimeType ?? "image/png"} sizes="192x192" href={versionedIconUrl} />
          <link rel="icon" type={iconMimeType ?? "image/png"} sizes="512x512" href={versionedIconUrl} />
        </>
      ) : null}
    </>
  );
}
