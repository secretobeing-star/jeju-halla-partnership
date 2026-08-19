import { NextResponse } from "next/server";
import { buildPwaManifest, isPwaEnabled } from "@/lib/site-pwa";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function createPwaManifestResponse() {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "site_pwa_enabled, site_pwa_name, site_pwa_short_name, site_pwa_icon_url, site_pwa_theme_color, site_pwa_chrome_tab_theme_color, site_pwa_taskbar_theme_color, site_pwa_background_color, site_favicon_url, site_nav_brand_icon_url, site_title, header_title, link_preview_title, main_domain",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!isPwaEnabled(data)) {
    return NextResponse.json({ error: "PWA is disabled." }, { status: 404 });
  }

  const manifest = buildPwaManifest(data);

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
