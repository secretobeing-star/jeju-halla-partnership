import type { SiteAnalyticsEventType } from "@/lib/site-analytics";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export function recordSiteAnalyticsEvent(eventType: SiteAnalyticsEventType, path = "/") {
  const admin = createSupabaseAdmin();
  if (!admin) return;
  void admin.from("site_analytics_events").insert({ event_type: eventType, path });
}
