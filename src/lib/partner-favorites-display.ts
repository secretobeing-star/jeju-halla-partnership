import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_PARTNER_FAVORITES_LABEL = "즐겨찾기";
export const DEFAULT_PARTNER_FAVORITES_EMPTY_MESSAGE = "등록된 항목이 없습니다.";

export function getPartnerFavoritesLabel(
  settings?: Pick<SiteSettings, "partner_favorites_label"> | null,
): string {
  return settings?.partner_favorites_label?.trim() || DEFAULT_PARTNER_FAVORITES_LABEL;
}

export function getPartnerFavoritesEmptyMessage(
  settings?: Pick<SiteSettings, "partner_favorites_empty_message"> | null,
): string {
  return (
    settings?.partner_favorites_empty_message?.trim() || DEFAULT_PARTNER_FAVORITES_EMPTY_MESSAGE
  );
}

export type PartnerFavoritesDisplaySettings = {
  enabled: boolean;
  label: string;
  emptyMessage: string;
};

export function getPartnerFavoritesDisplaySettings(
  settings?: Pick<
    SiteSettings,
    "partner_favorites_enabled" | "partner_favorites_label" | "partner_favorites_empty_message"
  > | null,
): PartnerFavoritesDisplaySettings {
  return {
    enabled: settings?.partner_favorites_enabled ?? true,
    label: getPartnerFavoritesLabel(settings),
    emptyMessage: getPartnerFavoritesEmptyMessage(settings),
  };
}
