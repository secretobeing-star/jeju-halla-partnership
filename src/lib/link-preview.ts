import { DEFAULT_SITE_SETTINGS } from "@/lib/default-site-settings";

type LinkPreviewSettings = {
  link_preview_title?: string | null;
  link_preview_description?: string | null;
  link_preview_image_url?: string | null;
  site_title?: string | null;
  header_title?: string | null;
  header_sub?: string | null;
  banner_image_url?: string | null;
};

export function resolveLinkPreviewTitle(settings: LinkPreviewSettings | null | undefined) {
  return (
    settings?.link_preview_title?.trim() ||
    settings?.site_title?.trim() ||
    settings?.header_title?.trim() ||
    DEFAULT_SITE_SETTINGS.header_title
  );
}

export function resolveLinkPreviewDescription(settings: LinkPreviewSettings | null | undefined) {
  return (
    settings?.link_preview_description?.trim() ||
    settings?.header_sub?.trim() ||
    DEFAULT_SITE_SETTINGS.header_sub
  );
}

export function resolveLinkPreviewImageUrl(settings: LinkPreviewSettings | null | undefined) {
  return settings?.link_preview_image_url?.trim() || settings?.banner_image_url?.trim() || null;
}
