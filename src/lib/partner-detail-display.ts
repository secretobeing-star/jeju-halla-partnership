import type { SiteSettings } from "@/lib/supabase";

export const DEFAULT_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM = 98;
export const MIN_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM = 48;
export const MAX_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM = 120;

export function getPartnerDetailSectionLabel(
  settings?: Pick<SiteSettings, "partner_detail_section_label"> | null,
) {
  return settings?.partner_detail_section_label?.trim() || null;
}

export function getPartnerMapSectionLabel(
  settings?: Pick<SiteSettings, "partner_map_section_label"> | null,
) {
  return settings?.partner_map_section_label?.trim() || null;
}

export function normalizePartnerDetailPopupMaxWidthRem(value: number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM;
  }

  return Math.min(
    MAX_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM,
    Math.max(MIN_PARTNER_DETAIL_POPUP_MAX_WIDTH_REM, Math.round(parsed)),
  );
}

export function getPartnerDetailPopupMaxWidthRem(
  settings?: Pick<SiteSettings, "partner_detail_popup_max_width_rem"> | null,
) {
  return normalizePartnerDetailPopupMaxWidthRem(settings?.partner_detail_popup_max_width_rem);
}

export type PartnerDetailDisplaySettings = {
  detailSectionLabel: string | null;
  mapSectionLabel: string | null;
  popupMaxWidthRem: number;
};

export function getPartnerDetailDisplaySettings(
  settings?: Pick<
    SiteSettings,
    "partner_detail_section_label" | "partner_map_section_label" | "partner_detail_popup_max_width_rem"
  > | null,
): PartnerDetailDisplaySettings {
  return {
    detailSectionLabel: getPartnerDetailSectionLabel(settings),
    mapSectionLabel: getPartnerMapSectionLabel(settings),
    popupMaxWidthRem: getPartnerDetailPopupMaxWidthRem(settings),
  };
}
