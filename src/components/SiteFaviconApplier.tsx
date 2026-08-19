"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const FAVICON_LINK_SELECTOR =
  'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';

function removeFaviconLinks() {
  document.querySelectorAll(FAVICON_LINK_SELECTOR).forEach((element) => element.remove());
}

function applyFavicon(url: string | null | undefined) {
  removeFaviconLinks();

  if (!url?.trim()) {
    return;
  }

  const href = url.trim();

  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.href = href;
  icon.setAttribute("data-site-favicon", "true");
  document.head.appendChild(icon);

  const shortcut = document.createElement("link");
  shortcut.rel = "shortcut icon";
  shortcut.href = href;
  shortcut.setAttribute("data-site-favicon", "true");
  document.head.appendChild(shortcut);

  const apple = document.createElement("link");
  apple.rel = "apple-touch-icon";
  apple.href = href;
  apple.setAttribute("data-site-favicon", "true");
  document.head.appendChild(apple);
}

type SiteFaviconApplierProps = {
  faviconUrl?: string | null;
};

export default function SiteFaviconApplier({ faviconUrl }: SiteFaviconApplierProps) {
  useEffect(() => {
    if (faviconUrl !== undefined) {
      applyFavicon(faviconUrl);
      return;
    }

    void supabase
      .from("site_settings")
      .select("site_favicon_url")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        applyFavicon(data?.site_favicon_url);
      });
  }, [faviconUrl]);

  return null;
}
