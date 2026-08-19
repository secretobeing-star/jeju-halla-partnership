export type UploadFolder =
  | "banners"
  | "shops"
  | "ads-left"
  | "ads-right"
  | "ads-mobile-hero"
  | "ads-mobile-category"
  | "ads-bottom-pc"
  | "board-images"
  | "board-videos"
  | "maintenance"
  | "loading"
  | "loading-fold-cover"
  | "loading-tablet"
  | "loading-tablet-ultra"
  | "favicon"
  | "nav-brand"
  | "nav-brand-title"
  | "nav-menu-icons"
  | "nav-backgrounds"
  | "link-preview"
  | "popups"
  | "events"
  | "error-pages"
  | "backgrounds"
  | "footer"
  | "footer-2"
  | "footer-social-icons"
  | "login-logo"
  | "student-auth-guide"
  | "student-photos"
  | "student-card-frames"
  | "student-card-brand"
  | "step-quest"
  | "map-events"
  | "push-notifications"
  | "pwa-icons"
  | "map-marker-settings";

export const ALLOWED_UPLOAD_FOLDERS = new Set<string>([
  "banners",
  "shops",
  "ads-left",
  "ads-right",
  "ads-mobile-hero",
  "ads-mobile-category",
  "ads-bottom-pc",
  "board-images",
  "board-videos",
  "maintenance",
  "loading",
  "loading-fold-cover",
  "loading-tablet",
  "loading-tablet-ultra",
  "favicon",
  "nav-brand",
  "nav-brand-title",
  "nav-menu-icons",
  "nav-backgrounds",
  "link-preview",
  "popups",
  "events",
  "error-pages",
  "backgrounds",
  "footer",
  "footer-2",
  "footer-social-icons",
  "login-logo",
  "student-auth-guide",
  "student-photos",
  "student-card-frames",
  "student-card-brand",
  "step-quest",
  "map-events",
  "push-notifications",
  "pwa-icons",
  "map-marker-settings",
]);

export const PUBLIC_BOARD_UPLOAD_FOLDERS = new Set([
  "board-images",
  "board-videos",
  "student-photos",
]);

export function buildUploadFilePath(folder: string, extension: string) {
  const fixedPaths: Record<string, string> = {
    banners: `banners/main-banner.${extension}`,
    "ads-left": `ads/left-banner.${extension}`,
    "ads-right": `ads/right-banner.${extension}`,
    "ads-mobile-hero": `ads/mobile-hero.${extension}`,
    "ads-mobile-category": `ads/mobile-category.${extension}`,
    "ads-bottom-pc": `ads/bottom-pc.${extension}`,
    maintenance: `maintenance/banner.${extension}`,
    favicon: `favicon/site-icon.${extension}`,
    "nav-brand": `nav-brand/brand-icon.${extension}`,
    "nav-brand-title": `nav-brand/brand-title.${extension}`,
    "login-logo": `login-logo/logo.${extension}`,
    footer: `footer/footer-image.${extension}`,
    "footer-2": `footer/footer-image-2.${extension}`,
    "link-preview": `link-preview/og-image.${extension}`,
  };

  const fixedPath = fixedPaths[folder];
  if (fixedPath) {
    return { primaryPath: fixedPath, retryPrefix: fixedPath.split("/")[0] };
  }

  return {
    primaryPath: `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`,
    retryPrefix: null,
  };
}

export function buildPublicAssetUrl(publicBaseUrl: string, filePath: string) {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const path = filePath.replace(/^\/+/, "");
  return `${base}/${path}?v=${Date.now()}`;
}

export function isAllowedUploadFolder(folder: string): folder is UploadFolder {
  return ALLOWED_UPLOAD_FOLDERS.has(folder);
}

export function isPublicBoardUploadFolder(folder: string) {
  return PUBLIC_BOARD_UPLOAD_FOLDERS.has(folder);
}
