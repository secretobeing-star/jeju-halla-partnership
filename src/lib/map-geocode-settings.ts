import {
  getConfiguredMapGeocodeProviders,
  getDefaultMapGeocodeProvider,
  type MapGeocodeProvider,
} from "@/lib/map-geocode";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { SiteSettings } from "@/lib/supabase";

export type MapGeocodeSiteSettings = {
  apiEnabled: boolean;
  naverEnabled: boolean;
  nominatimEnabled: boolean;
};

export const DEFAULT_MAP_GEOCODE_SITE_SETTINGS: MapGeocodeSiteSettings = {
  apiEnabled: true,
  naverEnabled: true,
  nominatimEnabled: true,
};

export function resolveMapGeocodeSiteSettings(
  row: Partial<SiteSettings> | null | undefined,
): MapGeocodeSiteSettings {
  return {
    apiEnabled: row?.partner_map_geocode_api_enabled ?? true,
    naverEnabled: row?.partner_map_geocode_naver_enabled ?? true,
    nominatimEnabled: row?.partner_map_geocode_nominatim_enabled ?? true,
  };
}

export function isMapGeocodeProviderEnabled(
  provider: MapGeocodeProvider,
  settings: MapGeocodeSiteSettings,
) {
  if (!settings.apiEnabled) {
    return false;
  }

  switch (provider) {
    case "naver":
      return settings.naverEnabled;
    case "nominatim":
      return settings.nominatimEnabled;
    default:
      return false;
  }
}

export function filterEnabledMapGeocodeProviders(
  providers: MapGeocodeProvider[],
  settings: MapGeocodeSiteSettings,
) {
  if (!settings.apiEnabled) {
    return [];
  }

  return providers.filter((provider) => isMapGeocodeProviderEnabled(provider, settings));
}

export function getEnabledMapGeocodeProviders(settings: MapGeocodeSiteSettings) {
  return filterEnabledMapGeocodeProviders(getConfiguredMapGeocodeProviders(), settings);
}

export function getDefaultEnabledMapGeocodeProvider(settings: MapGeocodeSiteSettings) {
  const enabled = getEnabledMapGeocodeProviders(settings);
  if (enabled.length === 0) {
    return null;
  }

  const preferred = getDefaultMapGeocodeProvider();
  if (enabled.includes(preferred)) {
    return preferred;
  }

  return enabled[0] ?? null;
}

export async function fetchMapGeocodeSiteSettings() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return DEFAULT_MAP_GEOCODE_SITE_SETTINGS;
  }

  const { data, error } = await admin
    .from("site_settings")
    .select(
      "partner_map_geocode_api_enabled, partner_map_geocode_naver_enabled, partner_map_geocode_nominatim_enabled",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return DEFAULT_MAP_GEOCODE_SITE_SETTINGS;
  }

  return resolveMapGeocodeSiteSettings(data ?? undefined);
}
