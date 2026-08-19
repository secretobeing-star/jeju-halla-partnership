import { createSupabaseServer } from "@/lib/supabase-server";
import type { SiteAdminPwaSettingsSource } from "@/lib/site-admin-pwa";
import type { SitePwaSettingsSource } from "@/lib/site-pwa";

export type PublicSiteMetadataSettings = {
  header_title: string | null;
  header_sub: string | null;
  site_title: string | null;
  banner_image_url: string | null;
  main_domain: string | null;
  site_favicon_url: string | null;
  link_preview_title: string | null;
  link_preview_description: string | null;
  link_preview_image_url: string | null;
};

export async function getPublicSiteSettingsForMetadata(): Promise<PublicSiteMetadataSettings | null> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("site_settings")
    .select(
      "header_title, header_sub, site_title, banner_image_url, main_domain, site_favicon_url, link_preview_title, link_preview_description, link_preview_image_url",
    )
    .eq("id", 1)
    .maybeSingle();

  return data;
}

export async function getPublicPwaSettings(): Promise<SitePwaSettingsSource | null> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("site_settings")
    .select(
      "site_pwa_enabled, site_pwa_name, site_pwa_short_name, site_pwa_icon_url, site_pwa_theme_color, site_pwa_chrome_tab_theme_color, site_pwa_taskbar_theme_color, site_pwa_background_color, site_pwa_install_prompt_enabled, site_pwa_install_guide_message, site_pwa_install_guide_steps, site_pwa_install_button_label, site_favicon_url, site_nav_brand_icon_url, site_title, header_title, link_preview_title, main_domain",
    )
    .eq("id", 1)
    .maybeSingle();

  return data;
}

export async function getPublicAdminPwaSettings(): Promise<SiteAdminPwaSettingsSource | null> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("site_settings")
    .select(
      "site_admin_pwa_enabled, site_admin_pwa_name, site_admin_pwa_short_name, site_admin_pwa_icon_url, site_admin_pwa_install_prompt_enabled, site_admin_pwa_install_guide_message, site_admin_pwa_install_button_label, site_pwa_icon_url, site_pwa_theme_color, site_pwa_chrome_tab_theme_color, site_pwa_taskbar_theme_color, site_pwa_background_color, site_favicon_url, site_nav_brand_icon_url, site_title, header_title, link_preview_title, main_domain, admin_site_title",
    )
    .eq("id", 1)
    .maybeSingle();

  return data;
}
