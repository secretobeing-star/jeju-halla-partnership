import { NextResponse } from "next/server";
import { buildAdminPwaManifest, isAdminPwaEnabled } from "@/lib/site-admin-pwa";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function createAdminPwaManifestResponse() {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "site_admin_pwa_enabled, site_admin_pwa_name, site_admin_pwa_short_name, site_admin_pwa_icon_url, site_pwa_icon_url, site_pwa_theme_color, site_pwa_chrome_tab_theme_color, site_pwa_taskbar_theme_color, site_pwa_background_color, site_favicon_url, site_nav_brand_icon_url, site_title, header_title, link_preview_title, main_domain, admin_site_title",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!isAdminPwaEnabled(data)) {
    return NextResponse.json({ error: "Admin PWA is disabled." }, { status: 404 });
  }

  const manifest = buildAdminPwaManifest(data);

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
