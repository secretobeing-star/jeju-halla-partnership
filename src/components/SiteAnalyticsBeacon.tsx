"use client";

import { useEffect } from "react";
import { isSharedLinkReferrer, trackSiteAnalytics } from "@/lib/site-analytics";
import { isStandaloneDisplayMode } from "@/lib/site-pwa";

export default function SiteAnalyticsBeacon() {
  useEffect(() => {
    trackSiteAnalytics("page_view");
    if (isStandaloneDisplayMode()) {
      trackSiteAnalytics("pwa_view");
    }
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source") || params.get("ref") || "";
    if (isSharedLinkReferrer(document.referrer) || isSharedLinkReferrer(utm)) {
      trackSiteAnalytics("link_share");
    }
  }, []);

  return null;
}
