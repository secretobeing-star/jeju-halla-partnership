import { SiteSettings } from "@/lib/supabase";



export type PartnerSort = "old" | "new" | "recommended";



export function getInitialPartnerSort(settings: SiteSettings): PartnerSort {

  const oldEnabled = settings.partner_sort_old_enabled ?? true;

  const newEnabled = settings.partner_sort_new_enabled ?? true;

  const recommendedEnabled = settings.partner_sort_recommended_enabled ?? true;



  const enabledSorts: PartnerSort[] = [];

  if (oldEnabled) enabledSorts.push("old");

  if (newEnabled) enabledSorts.push("new");

  if (recommendedEnabled) enabledSorts.push("recommended");



  if (enabledSorts.length === 1) {

    return enabledSorts[0];

  }



  if (settings.partner_default_sort_new ?? false) {

    return newEnabled ? "new" : enabledSorts[0] ?? "old";

  }



  return oldEnabled ? "old" : enabledSorts[0] ?? "new";

}

