import { SiteSettings } from "@/lib/supabase";

export type DeveloperModeSettings = Pick<
  SiteSettings,
  | "mobile_pc_mode_enabled"
  | "dark_mode_enabled"
  | "main_font_size_enabled"
  | "main_board_position_enabled"
  | "page_background_enabled"
  | "site_nav_background_enabled"
  | "google_ads_enabled"
  | "google_ads_malware_block_enabled"
  | "ad_video_gif_enabled"
  | "admin_user_password_visible"
  | "admin_partner_review_password_visible"
  | "board_secret_posts_enabled"
  | "board_secret_comments_enabled"
  | "board_ip_moderation_enabled"
  | "board_device_moderation_enabled"
  | "board_admin_secret_comments_main_visible_enabled"
  | "board_admin_secret_reply_parent_unlock_enabled"
  | "board_post_views_enabled"
  | "board_pinned_persist_pages_enabled"
  | "board_pinned_also_in_list_enabled"
  | "admin_partners_list_pagination_enabled"
  | "admin_posts_list_pagination_enabled"
  | "board_page_create_enabled"
  | "board_id_mode_enabled"
  | "board_mobile_media_upload_enabled"
>;

export function getDeveloperModeSettings(
  settings?: Partial<SiteSettings> | null,
): DeveloperModeSettings {
  return {
    mobile_pc_mode_enabled: settings?.mobile_pc_mode_enabled ?? false,
    dark_mode_enabled: settings?.dark_mode_enabled ?? false,
    main_font_size_enabled: settings?.main_font_size_enabled ?? false,
    main_board_position_enabled: settings?.main_board_position_enabled ?? false,
    page_background_enabled: settings?.page_background_enabled ?? false,
    site_nav_background_enabled: settings?.site_nav_background_enabled ?? false,
    google_ads_enabled: settings?.google_ads_enabled ?? false,
    google_ads_malware_block_enabled: settings?.google_ads_malware_block_enabled ?? false,
    ad_video_gif_enabled: settings?.ad_video_gif_enabled ?? false,
    admin_user_password_visible: settings?.admin_user_password_visible ?? false,
    admin_partner_review_password_visible: settings?.admin_partner_review_password_visible ?? false,
    board_secret_posts_enabled: settings?.board_secret_posts_enabled ?? false,
    board_secret_comments_enabled: settings?.board_secret_comments_enabled ?? false,
    board_ip_moderation_enabled: settings?.board_ip_moderation_enabled ?? false,
    board_device_moderation_enabled: settings?.board_device_moderation_enabled ?? false,
    board_admin_secret_comments_main_visible_enabled:
      settings?.board_admin_secret_comments_main_visible_enabled ?? false,
    board_admin_secret_reply_parent_unlock_enabled:
      settings?.board_admin_secret_reply_parent_unlock_enabled !== false,
    board_post_views_enabled: settings?.board_post_views_enabled ?? false,
    board_pinned_persist_pages_enabled:
      settings?.board_pinned_persist_pages_enabled ?? false,
    board_pinned_also_in_list_enabled:
      settings?.board_pinned_also_in_list_enabled ?? false,
    admin_partners_list_pagination_enabled:
      settings?.admin_partners_list_pagination_enabled ?? false,
    admin_posts_list_pagination_enabled:
      settings?.admin_posts_list_pagination_enabled ?? false,
    board_page_create_enabled: settings?.board_page_create_enabled ?? false,
    board_id_mode_enabled: settings?.board_id_mode_enabled ?? false,
    board_mobile_media_upload_enabled: settings?.board_mobile_media_upload_enabled ?? true,
  };
}
