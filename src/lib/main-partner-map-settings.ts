import type { SiteSettings } from "@/lib/supabase";

export type MainPartnerMapPosition = "above_list" | "below_list";

export type MainPartnerMapDisplay = {
  enabled: boolean;
  title: string | null;
  defaultExpanded: boolean;
  position: MainPartnerMapPosition;
};

export function normalizeMainPartnerMapPosition(
  value: string | null | undefined,
): MainPartnerMapPosition {
  return value === "below_list" ? "below_list" : "above_list";
}

export function getMainPartnerMapDisplay(
  settings?: Pick<
    SiteSettings,
    | "main_partner_map_enabled"
    | "main_partner_map_title"
    | "main_partner_map_default_expanded"
    | "main_partner_map_position"
  > | null,
): MainPartnerMapDisplay {
  return {
    enabled: settings?.main_partner_map_enabled ?? false,
    title: settings?.main_partner_map_title?.trim() || null,
    defaultExpanded: settings?.main_partner_map_default_expanded ?? true,
    position: normalizeMainPartnerMapPosition(settings?.main_partner_map_position),
  };
}
