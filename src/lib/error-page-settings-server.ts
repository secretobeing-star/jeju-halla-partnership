import { createSupabaseServer } from "@/lib/supabase-server";
import {
  ERROR_PAGE_SETTINGS_SELECT,
  getErrorPageDisplaySettings,
  type ErrorPageDisplaySettings,
  type ErrorPageSettingsSource,
  type ErrorPageVariant,
} from "@/lib/error-page-settings";

export async function getErrorPageDisplaySettingsFromServer(
  variant: ErrorPageVariant,
): Promise<ErrorPageDisplaySettings> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return getErrorPageDisplaySettings(null, variant);
  }

  const { data } = await supabase
    .from("site_settings")
    .select(ERROR_PAGE_SETTINGS_SELECT)
    .eq("id", 1)
    .maybeSingle();

  return getErrorPageDisplaySettings(data as ErrorPageSettingsSource | null, variant);
}
