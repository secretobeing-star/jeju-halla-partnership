"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  resolveAdminSiteTitle,
  resolveSiteTitle,
} from "@/lib/site-title";
import { supabase } from "@/lib/supabase";

type SiteTitleApplierProps = {
  siteTitle?: string | null;
  adminSiteTitle?: string | null;
  variant?: "site" | "admin";
};

export default function SiteTitleApplier({
  siteTitle,
  adminSiteTitle,
  variant,
}: SiteTitleApplierProps) {
  const pathname = usePathname();
  const resolvedVariant =
    variant ?? (pathname.startsWith("/admin") ? "admin" : "site");

  useEffect(() => {
    const hasExplicitValues =
      siteTitle !== undefined || adminSiteTitle !== undefined;

    if (hasExplicitValues) {
      document.title =
        resolvedVariant === "admin"
          ? resolveAdminSiteTitle(adminSiteTitle ?? null)
          : resolveSiteTitle(siteTitle ?? null);
      return;
    }

    void supabase
      .from("site_settings")
      .select("site_title, admin_site_title")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        document.title =
          resolvedVariant === "admin"
            ? resolveAdminSiteTitle(data?.admin_site_title ?? null)
            : resolveSiteTitle(data?.site_title ?? null);
      });
  }, [siteTitle, adminSiteTitle, resolvedVariant]);

  return null;
}
