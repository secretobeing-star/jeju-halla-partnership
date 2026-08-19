import { normalizeBoardColor } from "@/lib/board-definitions";

export const DEFAULT_PAGE_BACKGROUND_COLOR = "#F5F6F8";

export function normalizePageBackgroundColor(value: unknown): string | null {
  return normalizeBoardColor(value);
}

type PageBackgroundSettingsSource = {
  page_background_color?: string | null;
  page_background_image_url?: string | null;
};

export function getPageBackgroundStyle(settings: PageBackgroundSettingsSource | null | undefined) {
  return {
    color: normalizePageBackgroundColor(settings?.page_background_color) ?? DEFAULT_PAGE_BACKGROUND_COLOR,
    imageUrl: settings?.page_background_image_url?.trim() || null,
  };
}

export function hasConfiguredPageBackground(settings: PageBackgroundSettingsSource | null | undefined) {
  const { color, imageUrl } = getPageBackgroundStyle(settings);
  return Boolean(imageUrl) || color.toLowerCase() !== DEFAULT_PAGE_BACKGROUND_COLOR.toLowerCase();
}

export function getEffectivePageBackground(
  userPreference: boolean | null | undefined,
  siteDefaultEnabled: boolean | null | undefined,
): boolean {
  if (userPreference != null) {
    return userPreference;
  }

  return siteDefaultEnabled ?? true;
}
