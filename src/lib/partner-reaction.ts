import type { Partner } from "@/lib/supabase";

export function getPartnerRecommendationScore(partner: Pick<Partner, "like_count">) {
  return partner.like_count ?? 0;
}
