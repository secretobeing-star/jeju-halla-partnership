"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { buildCanonicalUrl } from "@/lib/site-domain";
import { supabase } from "@/lib/supabase";

type SiteDomainApplierProps = {
  mainDomain?: string | null;
};

export default function SiteDomainApplier({ mainDomain }: SiteDomainApplierProps) {
  const pathname = usePathname() || "/";

  useEffect(() => {
    let cancelled = false;

    const applyCanonical = (domain: string | null | undefined) => {
      const canonical = buildCanonicalUrl(domain, pathname);
      const existingLink = document.querySelector(
        'link[data-site-canonical="true"]',
      ) as HTMLLinkElement | null;
      const existingOgUrl = document.querySelector(
        'meta[data-site-og-url="true"]',
      ) as HTMLMetaElement | null;

      if (!canonical) {
        existingLink?.remove();
        existingOgUrl?.remove();
        return;
      }

      const link = existingLink ?? document.createElement("link");
      link.rel = "canonical";
      link.href = canonical;
      link.dataset.siteCanonical = "true";
      if (!existingLink) {
        document.head.appendChild(link);
      }

      const ogUrl = existingOgUrl ?? document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      ogUrl.content = canonical;
      ogUrl.dataset.siteOgUrl = "true";
      if (!existingOgUrl) {
        document.head.appendChild(ogUrl);
      }
    };

    if (mainDomain !== undefined) {
      applyCanonical(mainDomain);
      return;
    }

    void supabase
      .from("site_settings")
      .select("main_domain")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          applyCanonical(data?.main_domain ?? null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mainDomain, pathname]);

  return null;
}
