import { Partner } from "@/lib/supabase";
import { extractPlaceIdFromMapUrl, parsePartnerMapUrl } from "@/lib/partner-map-url";

export function partnerHasDetailView(partner: Partner) {
  if (partner.detail_description?.trim()) {
    return true;
  }

  if (partner.map_url?.trim()) {
    if (parsePartnerMapUrl(partner.map_url) || extractPlaceIdFromMapUrl(partner.map_url)) {
      return true;
    }
  }

  return partner.latitude != null && partner.longitude != null;
}