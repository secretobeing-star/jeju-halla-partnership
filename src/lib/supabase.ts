import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  checkSupabaseConfigured,
  getSupabaseEnv,
} from "@/lib/supabase-env";

export { checkSupabaseConfigured };

let cachedClient: SupabaseClient | null = null;
let cachedEnvKey = "";

function getEnvSignature() {
  const { url, anonKey } = getSupabaseEnv();
  return `${url}|${anonKey}`;
}

export function resetSupabaseClient() {
  cachedClient = null;
  cachedEnvKey = "";
}

function getOrCreateSupabaseClient(): SupabaseClient {
  const envKey = getEnvSignature();
  if (cachedClient && cachedEnvKey === envKey) {
    return cachedClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  cachedClient = createClient(url, anonKey);
  cachedEnvKey = envKey;
  return cachedClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getOrCreateSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type Partner = {
  id: string;
  name: string;
  category: string;
  address: string;
  region?: string | null;
  benefit: string;
  image_url: string | null;
  instagram_url: string | null;
  latitude: number | null;
  longitude: number | null;
  map_url?: string | null;
  is_active: boolean;
  benefit_start_date: string | null;
  benefit_end_date: string | null;
  benefit_status_text: string | null;
  benefit_status_color: string | null;
  benefit_status_bold?: boolean;
  benefit_status_italic?: boolean;
  benefit_status_underline?: boolean;
  benefit_status_strikethrough?: boolean;
  business_info?: string | null;
  detail_description?: string | null;
  benefit_color?: string | null;
  benefit_bold?: boolean;
  benefit_italic?: boolean;
  benefit_underline?: boolean;
  benefit_strikethrough?: boolean;
  like_count?: number;
  dislike_count?: number;
  review_count?: number;
  partnership_year?: number | null;
  created_at?: string;
};

export type PartnerPhoto = {
  id: string;
  partner_id: string;
  image_url: string;
  sort_order: number;
  created_at?: string;
};

export type BoardType = string;

export type BoardDefinition = {
  id: string;
  label: string;
  enabled: boolean;
  allow_user_posts: boolean;
  posts_per_page: number;
  color: string | null;
};

export type BoardPost = {
  id: string;
  board_type: BoardType;
  title: string;
  content?: string;
  author_name: string;
  is_hidden: boolean;
  is_secret?: boolean;
  is_pinned?: boolean;
  pinned_at?: string | null;
  like_count?: number;
  dislike_count?: number;
  view_count?: number;
  is_admin_managed?: boolean;
  admin_action_reason?: string | null;
  admin_visible_password?: string | null;
  user_ip?: string | null;
  voter_key?: string | null;
  status?: number;
  created_at: string;
};

export type BoardComment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_name: string;
  content: string;
  is_hidden: boolean;
  is_admin_managed?: boolean;
  is_secret?: boolean;
  admin_action_reason?: string | null;
  admin_visible_password?: string | null;
  user_ip?: string | null;
  voter_key?: string | null;
  created_at: string;
};

export type SitePopup = {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteEventListType = "event" | "winners";

export type SiteEvent = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  list_type?: SiteEventListType | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** 스탬프·거리·체류 인증 설정 */
  stamp_quest?: Record<string, unknown> | null;
};

export type SiteEventTab = {
  id: string;
  event_id: string;
  label: string;
  body_text: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteEventWithTabs = SiteEvent & {
  tabs: SiteEventTab[];
};

export type SiteEventComment = {
  id: string;
  tab_id: string;
  author_name: string;
  content: string;
  is_hidden: boolean;
  is_admin_managed?: boolean;
  admin_action_reason?: string | null;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  header_title: string;
  header_sub: string;
  notice_text: string;
  notice_text_enabled: boolean;
  notice_text_color: string | null;
  notice_text_link_url: string | null;
  notice_badge_label: string | null;
  notice_carousel_auto_enabled: boolean;
  notice_carousel_auto_interval_seconds: number;
  notice_items: Array<{
    id: string;
    tag: string | null;
    text: string;
    link_url: string | null;
    enabled: boolean;
  }>;
  banner_image_url: string | null;
  sidebar_left_image_url: string | null;
  sidebar_left_link_url: string | null;
  sidebar_right_image_url: string | null;
  sidebar_right_link_url: string | null;
  header_title_color: string | null;
  header_title_link_url: string | null;
  mobile_ad_below_hero_image_url: string | null;
  mobile_ad_below_hero_link_url: string | null;
  mobile_ad_below_category_image_url: string | null;
  mobile_ad_below_category_link_url: string | null;
  header_title_enabled: boolean;
  header_hero_enabled: boolean;
  banner_image_enabled: boolean;
  banner_image_only: boolean;
  bottom_pc_ad_image_url: string | null;
  bottom_pc_ad_link_url: string | null;
  post_reactions_enabled: boolean;
  board_sort_latest_enabled: boolean;
  board_sort_recommended_enabled: boolean;
  board_sort_views_enabled: boolean;
  board_list_refresh_enabled: boolean;
  partner_list_refresh_enabled: boolean;
  board_collapsible_enabled: boolean;
  board_inline_enabled: boolean;
  board_main_position_enabled: boolean;
  partner_sort_old_enabled: boolean;
  partner_sort_new_enabled: boolean;
  partner_sort_recommended_enabled: boolean;
  partner_reactions_enabled: boolean;
  partner_favorites_enabled: boolean;
  partner_favorites_label: string | null;
  partner_favorites_empty_message: string | null;
  partner_reviews_enabled: boolean;
  partner_map_geocode_api_enabled: boolean;
  partner_map_geocode_naver_enabled: boolean;
  partner_map_geocode_nominatim_enabled: boolean;
  partner_detail_section_label: string | null;
  partner_map_section_label: string | null;
  partner_map_locate_enabled: boolean;
  main_partner_map_enabled: boolean;
  main_partner_map_title: string | null;
  main_partner_map_default_expanded: boolean;
  main_partner_map_position: string;
  partner_category_section_enabled: boolean;
  main_category_region_user_toggle_enabled: boolean;
  main_map_user_toggle_enabled: boolean;
  partner_detail_popup_max_width_rem: number;
  partner_default_sort_new: boolean;
  pagination_scroll_top_enabled: boolean;
  partners_per_page: number;
  partners_mobile_settings_enabled: boolean;
  partners_per_page_mobile: number;
  partners_grid_columns_mobile: number;
  partners_mini_settings_enabled: boolean;
  partners_per_page_mini: number;
  partners_grid_columns_mini: number;
  partner_benefit_min_height_mini: number;
  partners_tablet_settings_enabled: boolean;
  partners_per_page_tablet: number;
  partners_grid_columns_tablet: number;
  partner_benefit_min_height_tablet: number;
  partners_wide_settings_enabled: boolean;
  partners_per_page_wide: number;
  admin_partners_list_pagination_enabled: boolean;
  admin_partners_per_page: number;
  admin_posts_list_pagination_enabled: boolean;
  admin_posts_per_page: number;
  board_page_create_enabled: boolean;
  board_id_mode_enabled: boolean;
  board_mobile_media_upload_enabled: boolean;
  partner_categories: string[];
  partner_search_keyword_groups: Array<{
    id: string;
    trigger: string;
    keywords: string[];
  }>;
  partner_regions: Array<{ id: string; label: string; areas: string[] }>;
  partner_region_filter_enabled: boolean;
  partner_region_filter_default_expanded: boolean;
  partner_year_filter_enabled: boolean;
  board_definitions: BoardDefinition[];
  free_board_enabled?: boolean;
  inquiry_board_enabled?: boolean;
  board_notice_label?: string;
  board_free_label?: string;
  board_inquiry_label?: string;
  admin_comment_delete_protected: boolean;
  partner_benefit_min_height_mobile: number;
  partner_benefit_min_height_desktop: number;
  partner_benefit_box_bg_color: string | null;
  partner_benefit_box_border_color: string | null;
  partner_business_info_default_expanded: boolean;
  mobile_pc_mode_enabled: boolean;
  dark_mode_enabled: boolean;
  main_font_size_enabled: boolean;
  main_site_size_floating_enabled: boolean;
  main_board_position_enabled: boolean;
  main_board_position_default: string;
  page_background_enabled: boolean;
  page_background_default_enabled: boolean;
  page_background_color: string | null;
  page_background_image_url: string | null;
  error_pages_enabled: boolean;
  error_page_logo_url: string | null;
  error_page_bg_color: string | null;
  error_page_text_color: string | null;
  error_page_button_bg_color: string | null;
  error_page_button_text_color: string | null;
  error_page_button_label: string | null;
  error_page_not_found_title: string | null;
  error_page_not_found_message: string | null;
  error_page_server_error_title: string | null;
  error_page_server_error_message: string | null;
  google_ads_enabled: boolean;
  google_ads_malware_block_enabled: boolean;
  ad_video_gif_enabled: boolean;
  admin_user_password_visible: boolean;
  admin_partner_review_password_visible: boolean;
  board_secret_posts_enabled: boolean;
  board_secret_comments_enabled: boolean;
  board_ip_moderation_enabled: boolean;
  board_device_moderation_enabled: boolean;
  board_admin_secret_comments_main_visible_enabled: boolean;
  board_admin_secret_reply_parent_unlock_enabled: boolean;
  board_post_views_enabled: boolean;
  board_post_numbered_list_enabled: boolean;
  board_post_popup_enabled: boolean;
  board_list_font_size_compact: number;
  board_list_font_size_desktop: number;
  board_post_detail_font_size: number;
  board_pinned_post_large_enabled: boolean;
  board_pinned_persist_pages_enabled: boolean;
  board_pinned_also_in_list_enabled: boolean;
  board_section_header_color: string | null;
  board_hidden_post_title: string | null;
  board_hidden_post_message: string | null;
  board_report_reasons: string[] | null;
  board_report_reasons_by_board: Record<string, string[]> | null;
  partner_review_report_reasons: string[] | null;
  board_report_success_message: string | null;
  partner_hidden_review_title: string | null;
  partner_hidden_review_message: string | null;
  footer_text: string | null;
  footer_text_enabled: boolean;
  footer_link_label: string | null;
  footer_link_url: string | null;
  footer_privacy_policy_url: string | null;
  footer_terms_url: string | null;
  footer_business_line1: string | null;
  footer_business_line2: string | null;
  footer_copyright: string | null;
  footer_image_url: string | null;
  footer_image2_url: string | null;
  footer_text_color: string | null;
  footer_dark_background_enabled: boolean;
  footer_social_hints_enabled: boolean;
  footer_social_notify_enabled: boolean;
  footer_social_links: Array<{
    id: string;
    label: string;
    href: string;
    external: boolean;
    enabled: boolean;
    icon_url: string | null;
    hint: string | null;
    notify_message: string | null;
  }>;
  site_maintenance_text: string | null;
  site_maintenance_image_url: string | null;
  site_maintenance_enabled: boolean;
  site_favicon_url: string | null;
  site_title: string | null;
  admin_site_title: string | null;
  link_preview_title: string | null;
  link_preview_description: string | null;
  link_preview_image_url: string | null;
  main_domain: string | null;
  site_nav_enabled: boolean;
  site_nav_sticky_enabled: boolean;
  site_nav_hints_enabled: boolean;
  site_nav_notify_enabled: boolean;
  site_nav_search_placeholder: string | null;
  site_nav_brand_title: string | null;
  site_nav_brand_title_hidden: boolean;
  site_nav_brand_title_image_url: string | null;
  site_nav_brand_icon_url: string | null;
  site_nav_brand_icon_hidden: boolean;
  site_nav_brand_chip_hidden: boolean;
  site_nav_brand_link_url: string | null;
  site_nav_brand_link_refresh_enabled: boolean;
  site_nav_links: Array<{
    id: string;
    label: string;
    href: string;
    external: boolean;
    enabled: boolean;
    icon_url: string | null;
    image_url: string | null;
    hint: string | null;
    notify_message: string | null;
  }>;
  site_nav_dropdown_enabled: boolean;
  site_nav_background_enabled: boolean;
  site_nav_floating_chips_enabled: boolean;
  site_nav_floating_chips_user_toggle_enabled: boolean;
  site_nav_background_display_enabled: boolean;
  site_nav_background_dark_enabled: boolean;
  site_nav_background_dark_overlay_opacity: number;
  site_nav_background_user_toggle_enabled: boolean;
  site_nav_background_image_url: string | null;
  site_nav_dropdown_links: Array<{
    id: string;
    label: string;
    href: string;
    external: boolean;
    enabled: boolean;
    icon_url: string | null;
    image_url: string | null;
    hint: string | null;
    notify_message: string | null;
  }>;
  site_loading_message: string | null;
  partners_loading_message: string | null;
  site_loading_image_url: string | null;
  partners_loading_image_url: string | null;
  settings_panel_notice_text: string | null;
  settings_panel_notice_url: string | null;
  settings_panel_notice_color: string | null;
  settings_panel_enabled: boolean;
  site_login_enabled: boolean;
  site_notifications_enabled: boolean;
  site_push_enabled: boolean;
  site_push_icon_url: string | null;
  site_push_badge_url: string | null;
  site_login_preview_enabled: boolean;
  site_login_modal_title: string | null;
  site_login_notice_line1: string | null;
  site_login_status_notice: string | null;
  site_login_notice_line2: string | null;
  site_login_button_label: string | null;
  site_login_provider_label: string | null;
  site_login_logo_url: string | null;
  site_student_id_enabled: boolean;
  site_student_id_pwa_swipe_enabled: boolean;
  site_student_id_card_title: string | null;
  site_student_auth_guide_title: string | null;
  site_student_auth_guide_body: string | null;
  site_student_auth_guide_image_url: string | null;
  site_student_auth_button_label: string | null;
  site_student_sheets_spreadsheet_id: string | null;
  site_student_sheets_log_tab: string | null;
  site_student_sheets_approval_tab: string | null;
  site_student_pending_message: string | null;
  site_student_ui_labels: Record<string, unknown> | null;
  /** 학생증 테두리(Frame) 아이템 목록 — CardFrameItem[] */
  site_student_card_frames: unknown[] | null;
  /** 학생증 하단 학교 로고 */
  site_student_card_school_logo_url: string | null;
  /** 학생증 하단·카드 학교 이름 (비우면 UI 라벨 cardSchool 사용) */
  site_student_card_school_name: string | null;
  /** 학생증 중앙 장식 이미지 */
  site_student_card_center_image_url: string | null;
  /** 중앙 이미지 투명도 0~1 */
  site_student_card_center_image_opacity: number | null;
  /** 학생증 카드 뒷배경 이미지 */
  site_student_card_background_url: string | null;
  /** 뒷배경 투명도 0~1 */
  site_student_card_background_opacity: number | null;
  /** N단계 스텝 퀘스트 설정 */
  site_step_quest: Record<string, unknown> | null;
  site_admin_pwa_enabled: boolean;
  site_admin_pwa_name: string | null;
  site_admin_pwa_short_name: string | null;
  site_admin_pwa_icon_url: string | null;
  site_admin_pwa_install_prompt_enabled: boolean;
  site_admin_pwa_install_guide_message: string | null;
  site_admin_pwa_install_button_label: string | null;
  site_pwa_enabled: boolean;
  site_pwa_name: string | null;
  site_pwa_short_name: string | null;
  site_pwa_icon_url: string | null;
  site_pwa_theme_color: string | null;
  site_pwa_chrome_tab_theme_color: string | null;
  site_pwa_taskbar_theme_color: string | null;
  site_pwa_background_color: string | null;
  site_pwa_install_prompt_enabled: boolean;
  site_pwa_install_guide_message: string | null;
  site_pwa_install_guide_steps: string | null;
  site_pwa_install_button_label: string | null;
  site_pwa_open_button_label: string | null;
  site_pwa_loading_enabled: boolean;
  site_pwa_loading_message: string | null;
  site_pwa_loading_image_url: string | null;
  site_pwa_loading_image_url_fold_cover: string | null;
  site_pwa_loading_image_url_tablet: string | null;
  site_pwa_loading_image_url_tablet_ultra: string | null;
  site_pwa_loading_duration_ms: number;
  site_pwa_loading_image_fullscreen: boolean;
  site_kakao_in_app_guide_enabled: boolean;
  site_kakao_in_app_guide_title: string | null;
  site_kakao_in_app_guide_message: string | null;
  site_kakao_in_app_guide_button_label: string | null;
  site_kakao_in_app_guide_samsung_button_label: string | null;
  site_kakao_in_app_guide_safari_button_label: string | null;
  site_kakao_in_app_guide_ios_popup_title: string | null;
  site_kakao_in_app_guide_ios_popup_message: string | null;
  site_kakao_in_app_guide_ios_popup_steps: string | null;
  site_kakao_in_app_guide_ios_safari_open_label: string | null;
  site_safari_browser_guide_enabled: boolean;
  site_safari_browser_guide_title: string | null;
  site_safari_browser_guide_message: string | null;
  site_safari_browser_guide_steps: string | null;
  site_safari_browser_guide_button_label: string | null;
  site_samsung_browser_guide_enabled: boolean;
  site_samsung_browser_guide_title: string | null;
  site_samsung_browser_guide_message: string | null;
  site_samsung_browser_guide_chrome_button_label: string | null;
  site_samsung_browser_guide_button_label: string | null;
  site_samsung_browser_guide_open_button_label: string | null;
  site_pwa_back_exit_enabled: boolean;
  site_pwa_back_exit_message: string | null;
  site_pwa_back_exit_timeout_ms: number;
  site_pwa_back_exit_popup_enabled: boolean;
  site_pwa_back_exit_popup_title: string | null;
  site_pwa_back_exit_popup_message: string | null;
  site_pwa_loading_back_exit_enabled: boolean;
  site_events_icon_url: string | null;
  site_events_label: string | null;
  site_events_hint: string | null;
  site_events_notify_message: string | null;
  site_pwa_first_run_notification_prompt_enabled: boolean;
  site_pwa_first_run_location_prompt_enabled: boolean;
  site_pwa_app_settings_enabled: boolean;
  site_pwa_app_settings_notification_enabled: boolean;
  site_pwa_app_settings_location_enabled: boolean;
  site_pwa_permission_notification_request_title: string | null;
  site_pwa_permission_notification_request_message: string | null;
  site_pwa_permission_notification_denied_title: string | null;
  site_pwa_permission_notification_denied_message: string | null;
  site_pwa_permission_location_request_title: string | null;
  site_pwa_permission_location_request_message: string | null;
  site_pwa_permission_location_denied_title: string | null;
  site_pwa_permission_location_denied_message: string | null;
  site_pwa_permission_app_notification_denied_message: string | null;
  site_pwa_permission_app_location_denied_message: string | null;
  site_pwa_permission_notification_request_title_ios: string | null;
  site_pwa_permission_notification_request_message_ios: string | null;
  site_pwa_permission_notification_denied_title_ios: string | null;
  site_pwa_permission_notification_denied_message_ios: string | null;
  site_pwa_permission_location_request_title_ios: string | null;
  site_pwa_permission_location_request_message_ios: string | null;
  site_pwa_permission_location_denied_title_ios: string | null;
  site_pwa_permission_location_denied_message_ios: string | null;
  site_pwa_permission_app_notification_denied_message_ios: string | null;
  site_pwa_permission_app_location_denied_message_ios: string | null;
};
