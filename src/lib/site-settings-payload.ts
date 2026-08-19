import { normalizeMainPartnerMapPosition } from "@/lib/main-partner-map-settings";
import { normalizePwaBackExitTimeoutMs } from "@/lib/app-back-stack";
import { normalizeSiteNavBackgroundDarkOverlayOpacity } from "@/lib/site-nav-background";
import { normalizeMainDomain } from "@/lib/site-domain";
import { normalizeSiteNavLinks } from "@/lib/site-nav-links";
import { SiteSettings } from "@/lib/supabase";
import { normalizeBoardDefinitions, normalizeBoardColor } from "@/lib/board-definitions";
import { normalizeFooterSocialLinks } from "@/lib/footer-social-links";
import { normalizeOptionalLinkUrl } from "@/lib/footer-text";
import { normalizePartnerCategories } from "@/lib/partner-categories";
import { normalizePartnerSearchKeywordGroups } from "@/lib/partner-search-keywords";
import { normalizePartnerRegionGroups } from "@/lib/partner-regions";
import { normalizePageBackgroundColor } from "@/lib/page-background";
import {
  normalizeSiteNoticeItems,
  normalizeSiteNoticeBadgeLabel,
  normalizeNoticeCarouselAutoInterval,
} from "@/lib/site-notices";
import {
  normalizePartnerBenefitHeight,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
  DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
} from "@/lib/partner-benefit-height";
import {
  normalizePartnersPerPage,
  normalizePartnersGridColumns,
  DEFAULT_PARTNERS_PER_PAGE_MOBILE,
  DEFAULT_PARTNERS_PER_PAGE_MINI,
  DEFAULT_PARTNERS_PER_PAGE_TABLET,
  DEFAULT_PARTNERS_PER_PAGE_WIDE,
  DEFAULT_PARTNERS_GRID_COLUMNS_MOBILE,
  DEFAULT_PARTNERS_GRID_COLUMNS_MINI,
  DEFAULT_PARTNERS_GRID_COLUMNS_TABLET,
  normalizeAdminPartnersPerPage,
  normalizeAdminPostsPerPage,
} from "@/lib/pagination-settings";
import {
  DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT,
  DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP,
  normalizeBoardListFontSize,
  normalizeBoardPostDetailFontSize,
} from "@/lib/board-list-font-size";
import {
  normalizePartnerDetailPopupMaxWidthRem,
} from "@/lib/partner-detail-display";

export function buildSiteSettingsPayload(next: SiteSettings) {
  const noticeItems = normalizeSiteNoticeItems(next.notice_items);
  const primaryNotice = noticeItems[0];

  return {
    id: 1,
    header_title: next.header_title,
    header_sub: next.header_sub,
    notice_text: primaryNotice?.text ?? next.notice_text,
    notice_text_enabled: next.notice_text_enabled,
    notice_text_color: next.notice_text_color?.trim() || null,
    notice_text_link_url:
      primaryNotice?.link_url ?? (next.notice_text_link_url?.trim() || null),
    notice_badge_label: normalizeSiteNoticeBadgeLabel(next.notice_badge_label),
    notice_carousel_auto_enabled: next.notice_carousel_auto_enabled ?? false,
    notice_carousel_auto_interval_seconds: normalizeNoticeCarouselAutoInterval(
      next.notice_carousel_auto_interval_seconds,
    ),
    notice_items: noticeItems,
    banner_image_url: next.banner_image_url,
    sidebar_left_image_url: next.sidebar_left_image_url,
    sidebar_left_link_url: next.sidebar_left_link_url?.trim() || null,
    sidebar_right_image_url: next.sidebar_right_image_url,
    sidebar_right_link_url: next.sidebar_right_link_url?.trim() || null,
    header_title_color: next.header_title_color?.trim() || null,
    header_title_link_url: next.header_title_link_url?.trim() || null,
    mobile_ad_below_hero_image_url: next.mobile_ad_below_hero_image_url,
    mobile_ad_below_hero_link_url: next.mobile_ad_below_hero_link_url?.trim() || null,
    mobile_ad_below_category_image_url: next.mobile_ad_below_category_image_url,
    mobile_ad_below_category_link_url:
      next.mobile_ad_below_category_link_url?.trim() || null,
    header_title_enabled: next.header_title_enabled ?? true,
    header_hero_enabled: next.header_hero_enabled ?? true,
    banner_image_enabled: next.banner_image_enabled ?? true,
    banner_image_only: next.banner_image_only ?? false,
    bottom_pc_ad_image_url: next.bottom_pc_ad_image_url,
    bottom_pc_ad_link_url: next.bottom_pc_ad_link_url?.trim() || null,
    post_reactions_enabled: next.post_reactions_enabled ?? true,
    board_sort_latest_enabled: next.board_sort_latest_enabled ?? true,
    board_sort_recommended_enabled: next.board_sort_recommended_enabled ?? true,
    board_sort_views_enabled: next.board_sort_views_enabled ?? true,
    board_list_refresh_enabled: next.board_list_refresh_enabled ?? true,
    partner_list_refresh_enabled: next.partner_list_refresh_enabled ?? true,
    board_hidden_post_title: next.board_hidden_post_title?.trim() || null,
    board_hidden_post_message: next.board_hidden_post_message?.trim() || null,
    partner_hidden_review_title: next.partner_hidden_review_title?.trim() || null,
    partner_hidden_review_message: next.partner_hidden_review_message?.trim() || null,
    board_collapsible_enabled: next.board_collapsible_enabled ?? true,
    board_inline_enabled: next.board_inline_enabled ?? true,
    board_main_position_enabled: next.board_main_position_enabled ?? true,
    partner_sort_old_enabled: next.partner_sort_old_enabled ?? true,
    partner_sort_new_enabled: next.partner_sort_new_enabled ?? true,
    partner_sort_recommended_enabled: next.partner_sort_recommended_enabled ?? true,
    partner_reactions_enabled: next.partner_reactions_enabled ?? true,
    partner_favorites_enabled: next.partner_favorites_enabled ?? true,
    partner_favorites_label: next.partner_favorites_label?.trim() || null,
    partner_favorites_empty_message: next.partner_favorites_empty_message?.trim() || null,
    partner_reviews_enabled: next.partner_reviews_enabled ?? true,
    partner_map_geocode_api_enabled: next.partner_map_geocode_api_enabled ?? true,
    partner_map_geocode_naver_enabled: next.partner_map_geocode_naver_enabled ?? true,
    partner_map_geocode_nominatim_enabled: next.partner_map_geocode_nominatim_enabled ?? true,
    partner_detail_section_label: next.partner_detail_section_label?.trim() || null,
    partner_map_section_label: next.partner_map_section_label?.trim() || null,
    partner_map_locate_enabled: next.partner_map_locate_enabled ?? true,
    main_partner_map_enabled: next.main_partner_map_enabled ?? false,
    main_partner_map_title: next.main_partner_map_title?.trim() || null,
    main_partner_map_default_expanded: next.main_partner_map_default_expanded ?? true,
    main_partner_map_position: normalizeMainPartnerMapPosition(next.main_partner_map_position),
    partner_category_section_enabled: next.partner_category_section_enabled ?? true,
    main_category_region_user_toggle_enabled:
      next.main_category_region_user_toggle_enabled ?? true,
    main_map_user_toggle_enabled: next.main_map_user_toggle_enabled ?? true,
    partner_detail_popup_max_width_rem: normalizePartnerDetailPopupMaxWidthRem(
      next.partner_detail_popup_max_width_rem,
    ),
    partner_default_sort_new: next.partner_default_sort_new ?? false,
    pagination_scroll_top_enabled: next.pagination_scroll_top_enabled ?? true,
    partners_per_page: normalizePartnersPerPage(next.partners_per_page),
    partners_mobile_settings_enabled: next.partners_mobile_settings_enabled ?? false,
    partners_per_page_mobile: normalizePartnersPerPage(
      next.partners_per_page_mobile,
      DEFAULT_PARTNERS_PER_PAGE_MOBILE,
    ),
    partners_grid_columns_mobile: normalizePartnersGridColumns(
      next.partners_grid_columns_mobile,
      DEFAULT_PARTNERS_GRID_COLUMNS_MOBILE,
    ),
    partners_mini_settings_enabled: next.partners_mini_settings_enabled ?? false,
    partners_per_page_mini: normalizePartnersPerPage(
      next.partners_per_page_mini,
      DEFAULT_PARTNERS_PER_PAGE_MINI,
    ),
    partners_grid_columns_mini: normalizePartnersGridColumns(
      next.partners_grid_columns_mini,
      DEFAULT_PARTNERS_GRID_COLUMNS_MINI,
    ),
    partner_benefit_min_height_mini: normalizePartnerBenefitHeight(
      next.partner_benefit_min_height_mini,
      DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MINI,
    ),
    partners_tablet_settings_enabled: next.partners_tablet_settings_enabled ?? false,
    partners_per_page_tablet: normalizePartnersPerPage(
      next.partners_per_page_tablet,
      DEFAULT_PARTNERS_PER_PAGE_TABLET,
    ),
    partners_grid_columns_tablet: normalizePartnersGridColumns(
      next.partners_grid_columns_tablet,
      DEFAULT_PARTNERS_GRID_COLUMNS_TABLET,
    ),
    partner_benefit_min_height_tablet: normalizePartnerBenefitHeight(
      next.partner_benefit_min_height_tablet,
      DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_TABLET,
    ),
    partners_wide_settings_enabled: next.partners_wide_settings_enabled ?? false,
    partners_per_page_wide: normalizePartnersPerPage(
      next.partners_per_page_wide,
      DEFAULT_PARTNERS_PER_PAGE_WIDE,
    ),
    admin_partners_list_pagination_enabled:
      next.admin_partners_list_pagination_enabled ?? false,
    admin_partners_per_page: normalizeAdminPartnersPerPage(next.admin_partners_per_page),
    admin_posts_list_pagination_enabled: next.admin_posts_list_pagination_enabled ?? false,
    admin_posts_per_page: normalizeAdminPostsPerPage(next.admin_posts_per_page),
    board_page_create_enabled: next.board_page_create_enabled ?? false,
    board_id_mode_enabled: next.board_id_mode_enabled ?? false,
    board_mobile_media_upload_enabled: next.board_mobile_media_upload_enabled ?? true,
    partner_categories: normalizePartnerCategories(next.partner_categories),
    partner_search_keyword_groups: normalizePartnerSearchKeywordGroups(
      next.partner_search_keyword_groups,
    ),
    partner_regions: normalizePartnerRegionGroups(next.partner_regions),
    partner_region_filter_enabled: next.partner_region_filter_enabled ?? true,
    partner_region_filter_default_expanded:
      next.partner_region_filter_default_expanded ?? false,
    partner_year_filter_enabled: next.partner_year_filter_enabled ?? true,
    board_definitions: normalizeBoardDefinitions(next.board_definitions),
    admin_comment_delete_protected: next.admin_comment_delete_protected,
    partner_benefit_min_height_mobile: normalizePartnerBenefitHeight(
      next.partner_benefit_min_height_mobile,
      DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_MOBILE,
    ),
    partner_benefit_min_height_desktop: normalizePartnerBenefitHeight(
      next.partner_benefit_min_height_desktop,
      DEFAULT_PARTNER_BENEFIT_MIN_HEIGHT_DESKTOP,
    ),
    partner_benefit_box_bg_color: normalizeBoardColor(next.partner_benefit_box_bg_color) || null,
    partner_benefit_box_border_color:
      normalizeBoardColor(next.partner_benefit_box_border_color) || null,
    partner_business_info_default_expanded:
      next.partner_business_info_default_expanded ?? false,
    mobile_pc_mode_enabled: next.mobile_pc_mode_enabled ?? false,
    dark_mode_enabled: next.dark_mode_enabled ?? false,
    main_font_size_enabled: next.main_font_size_enabled ?? false,
    main_site_size_floating_enabled: next.main_site_size_floating_enabled ?? false,
    main_board_position_enabled: next.main_board_position_enabled ?? false,
    main_board_position_default:
      next.main_board_position_default === "below" ? "below" : "above",
    page_background_enabled: next.page_background_enabled ?? false,
    page_background_default_enabled: next.page_background_default_enabled ?? true,
    page_background_color: normalizePageBackgroundColor(next.page_background_color),
    page_background_image_url: next.page_background_image_url?.trim() || null,
    error_pages_enabled: next.error_pages_enabled ?? true,
    error_page_logo_url: next.error_page_logo_url?.trim() || null,
    error_page_bg_color: normalizeBoardColor(next.error_page_bg_color) || null,
    error_page_text_color: normalizeBoardColor(next.error_page_text_color) || null,
    error_page_button_bg_color: normalizeBoardColor(next.error_page_button_bg_color) || null,
    error_page_button_text_color: normalizeBoardColor(next.error_page_button_text_color) || null,
    error_page_button_label: next.error_page_button_label?.trim() || null,
    error_page_not_found_title: next.error_page_not_found_title?.trim() || null,
    error_page_not_found_message: next.error_page_not_found_message?.trim() || null,
    error_page_server_error_title: next.error_page_server_error_title?.trim() || null,
    error_page_server_error_message: next.error_page_server_error_message?.trim() || null,
    google_ads_enabled: next.google_ads_enabled ?? false,
    google_ads_malware_block_enabled: next.google_ads_malware_block_enabled ?? false,
    ad_video_gif_enabled: next.ad_video_gif_enabled ?? false,
    admin_user_password_visible: next.admin_user_password_visible ?? false,
    admin_partner_review_password_visible: next.admin_partner_review_password_visible ?? false,
    board_secret_posts_enabled: next.board_secret_posts_enabled ?? false,
    board_secret_comments_enabled: next.board_secret_comments_enabled ?? false,
    board_ip_moderation_enabled: next.board_ip_moderation_enabled ?? false,
    board_device_moderation_enabled: next.board_device_moderation_enabled ?? false,
    board_admin_secret_comments_main_visible_enabled:
      next.board_admin_secret_comments_main_visible_enabled ?? false,
    board_admin_secret_reply_parent_unlock_enabled:
      next.board_admin_secret_reply_parent_unlock_enabled ?? true,
    board_post_views_enabled: next.board_post_views_enabled ?? false,
    board_post_numbered_list_enabled: next.board_post_numbered_list_enabled ?? false,
    board_post_popup_enabled: next.board_post_popup_enabled ?? true,
    board_list_font_size_compact: normalizeBoardListFontSize(
      next.board_list_font_size_compact,
      DEFAULT_BOARD_LIST_FONT_SIZE_COMPACT,
    ),
    board_list_font_size_desktop: normalizeBoardListFontSize(
      next.board_list_font_size_desktop,
      DEFAULT_BOARD_LIST_FONT_SIZE_DESKTOP,
    ),
    board_post_detail_font_size: normalizeBoardPostDetailFontSize(
      next.board_post_detail_font_size,
    ),
    board_pinned_post_large_enabled: next.board_pinned_post_large_enabled ?? false,
    board_pinned_persist_pages_enabled: next.board_pinned_persist_pages_enabled ?? false,
    board_pinned_also_in_list_enabled: next.board_pinned_also_in_list_enabled ?? false,
    board_section_header_color: next.board_section_header_color?.trim() || null,
    footer_text: next.footer_text?.trim() || null,
    footer_text_enabled: next.footer_text_enabled ?? false,
    footer_link_label: next.footer_link_label?.trim() || null,
    footer_link_url: normalizeOptionalLinkUrl(next.footer_link_url),
    footer_privacy_policy_url: normalizeOptionalLinkUrl(next.footer_privacy_policy_url),
    footer_terms_url: normalizeOptionalLinkUrl(next.footer_terms_url),
    footer_business_line1: next.footer_business_line1?.trim() || null,
    footer_business_line2: next.footer_business_line2?.trim() || null,
    footer_copyright: next.footer_copyright?.trim() || null,
    footer_image_url: next.footer_image_url?.trim() || null,
    footer_image2_url: next.footer_image2_url?.trim() || null,
    footer_text_color: normalizeBoardColor(next.footer_text_color) || null,
    footer_dark_background_enabled: next.footer_dark_background_enabled ?? false,
    footer_social_hints_enabled: next.footer_social_hints_enabled ?? true,
    footer_social_notify_enabled: next.footer_social_notify_enabled ?? true,
    footer_social_links: normalizeFooterSocialLinks(next.footer_social_links),
    site_maintenance_text: next.site_maintenance_text?.trim() || null,
    site_maintenance_image_url: next.site_maintenance_image_url,
    site_maintenance_enabled: next.site_maintenance_enabled ?? false,
    site_favicon_url: next.site_favicon_url,
    site_title: next.site_title?.trim() || null,
    admin_site_title: next.admin_site_title?.trim() || null,
    link_preview_title: next.link_preview_title?.trim() || null,
    link_preview_description: next.link_preview_description?.trim() || null,
    link_preview_image_url: next.link_preview_image_url?.trim() || null,
    main_domain: normalizeMainDomain(next.main_domain),
    site_nav_enabled: next.site_nav_enabled ?? true,
    site_nav_sticky_enabled: false,
    site_nav_hints_enabled: next.site_nav_hints_enabled ?? true,
    site_nav_notify_enabled: next.site_nav_notify_enabled ?? true,
    site_nav_search_placeholder: next.site_nav_search_placeholder?.trim() || null,
    site_nav_brand_title: next.site_nav_brand_title?.trim() || null,
    site_nav_brand_title_hidden: next.site_nav_brand_title_hidden ?? false,
    site_nav_brand_title_image_url: next.site_nav_brand_title_image_url?.trim() || null,
    site_nav_brand_icon_url: next.site_nav_brand_icon_url?.trim() || null,
    site_nav_brand_icon_hidden: next.site_nav_brand_icon_hidden ?? false,
    site_nav_brand_chip_hidden: next.site_nav_brand_chip_hidden ?? false,
    site_nav_brand_link_url: next.site_nav_brand_link_url?.trim() || null,
    site_nav_brand_link_refresh_enabled: next.site_nav_brand_link_refresh_enabled ?? false,
    site_nav_links: normalizeSiteNavLinks(next.site_nav_links),
    site_nav_dropdown_enabled: next.site_nav_dropdown_enabled ?? true,
    site_nav_background_enabled: next.site_nav_background_enabled ?? false,
    site_nav_floating_chips_enabled: next.site_nav_floating_chips_enabled ?? false,
    site_nav_floating_chips_user_toggle_enabled:
      next.site_nav_floating_chips_user_toggle_enabled ?? true,
    site_nav_background_display_enabled: next.site_nav_background_display_enabled ?? false,
    site_nav_background_dark_enabled: next.site_nav_background_dark_enabled ?? false,
    site_nav_background_dark_overlay_opacity: normalizeSiteNavBackgroundDarkOverlayOpacity(
      next.site_nav_background_dark_overlay_opacity,
    ),
    site_nav_background_user_toggle_enabled: next.site_nav_background_user_toggle_enabled ?? true,
    site_nav_background_image_url: next.site_nav_background_image_url?.trim() || null,
    site_nav_dropdown_links: normalizeSiteNavLinks(next.site_nav_dropdown_links),
    site_loading_message: next.site_loading_message?.trim() || null,
    partners_loading_message: next.partners_loading_message?.trim() || null,
    site_loading_image_url: next.site_loading_image_url,
    partners_loading_image_url: next.partners_loading_image_url,
    settings_panel_notice_text: next.settings_panel_notice_text?.trim() || null,
    settings_panel_notice_url: normalizeSettingsPanelNoticeUrl(next.settings_panel_notice_url),
    settings_panel_notice_color: normalizeBoardColor(next.settings_panel_notice_color) || null,
    settings_panel_enabled: next.settings_panel_enabled ?? false,
    site_login_enabled: next.site_login_enabled ?? false,
    site_notifications_enabled: next.site_notifications_enabled ?? false,
    site_push_enabled: next.site_push_enabled ?? false,
    site_push_icon_url: next.site_push_icon_url?.trim() || null,
    site_push_badge_url: next.site_push_badge_url?.trim() || null,
    site_login_preview_enabled: next.site_login_preview_enabled ?? false,
    site_login_modal_title: next.site_login_modal_title?.trim() || null,
    site_login_notice_line1: next.site_login_notice_line1?.trim() || null,
    site_login_status_notice: next.site_login_status_notice?.trim() || null,
    site_login_notice_line2: next.site_login_notice_line2?.trim() || null,
    site_login_button_label: next.site_login_button_label?.trim() || null,
    site_login_provider_label: next.site_login_provider_label?.trim() || null,
    site_login_logo_url: next.site_login_logo_url?.trim() || null,
    site_student_id_enabled: next.site_student_id_enabled ?? false,
    site_student_id_pwa_swipe_enabled: next.site_student_id_pwa_swipe_enabled ?? true,
    site_student_id_card_title: next.site_student_id_card_title?.trim() || null,
    site_student_auth_guide_title: next.site_student_auth_guide_title?.trim() || null,
    site_student_auth_guide_body: next.site_student_auth_guide_body?.trim() || null,
    site_student_auth_guide_image_url: next.site_student_auth_guide_image_url?.trim() || null,
    site_student_auth_button_label: next.site_student_auth_button_label?.trim() || null,
    site_student_sheets_spreadsheet_id: next.site_student_sheets_spreadsheet_id?.trim() || null,
    site_student_sheets_log_tab: next.site_student_sheets_log_tab?.trim() || null,
    site_student_sheets_approval_tab: next.site_student_sheets_approval_tab?.trim() || null,
    site_student_pending_message: next.site_student_pending_message?.trim() || null,
    site_student_ui_labels:
      next.site_student_ui_labels &&
      typeof next.site_student_ui_labels === "object" &&
      !Array.isArray(next.site_student_ui_labels)
        ? (next.site_student_ui_labels as Record<string, unknown>)
        : null,
    site_student_card_frames: Array.isArray(next.site_student_card_frames)
      ? next.site_student_card_frames
      : null,
    site_student_card_school_logo_url: next.site_student_card_school_logo_url?.trim() || null,
    site_student_card_school_name: next.site_student_card_school_name?.trim() || null,
    site_student_card_center_image_url: next.site_student_card_center_image_url?.trim() || null,
    site_student_card_center_image_opacity: (() => {
      const raw = next.site_student_card_center_image_opacity;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) {
        return 0.28;
      }
      return Math.min(1, Math.max(0, n));
    })(),
    site_student_card_background_url: next.site_student_card_background_url?.trim() || null,
    site_student_card_background_opacity: (() => {
      const raw = next.site_student_card_background_opacity;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) {
        return 0.45;
      }
      return Math.min(1, Math.max(0, n));
    })(),
    site_step_quest:
      next.site_step_quest &&
      typeof next.site_step_quest === "object" &&
      !Array.isArray(next.site_step_quest)
        ? (next.site_step_quest as Record<string, unknown>)
        : null,
    site_admin_pwa_enabled: next.site_admin_pwa_enabled ?? false,
    site_admin_pwa_name: next.site_admin_pwa_name?.trim() || null,
    site_admin_pwa_short_name: next.site_admin_pwa_short_name?.trim() || null,
    site_admin_pwa_icon_url: next.site_admin_pwa_icon_url?.trim() || null,
    site_admin_pwa_install_prompt_enabled: next.site_admin_pwa_install_prompt_enabled ?? true,
    site_admin_pwa_install_guide_message:
      next.site_admin_pwa_install_guide_message?.trim() || null,
    site_admin_pwa_install_button_label:
      next.site_admin_pwa_install_button_label?.trim() || null,
    site_pwa_enabled: next.site_pwa_enabled ?? false,
    site_pwa_name: next.site_pwa_name?.trim() || null,
    site_pwa_short_name: next.site_pwa_short_name?.trim() || null,
    site_pwa_icon_url: next.site_pwa_icon_url?.trim() || null,
    site_pwa_theme_color: normalizeBoardColor(next.site_pwa_theme_color) || null,
    site_pwa_chrome_tab_theme_color: normalizeBoardColor(next.site_pwa_chrome_tab_theme_color) || null,
    site_pwa_taskbar_theme_color: normalizeBoardColor(next.site_pwa_taskbar_theme_color) || null,
    site_pwa_background_color: normalizeBoardColor(next.site_pwa_background_color) || null,
    site_pwa_install_prompt_enabled: next.site_pwa_install_prompt_enabled ?? true,
    site_pwa_install_guide_message: next.site_pwa_install_guide_message?.trim() || null,
    site_pwa_install_guide_steps: next.site_pwa_install_guide_steps?.trim() || null,
    site_pwa_install_button_label: next.site_pwa_install_button_label?.trim() || null,
    site_pwa_open_button_label: next.site_pwa_open_button_label?.trim() || null,
    site_pwa_loading_enabled: next.site_pwa_loading_enabled ?? true,
    site_pwa_loading_message: next.site_pwa_loading_message?.trim() || null,
    site_pwa_loading_image_url: next.site_pwa_loading_image_url?.trim() || null,
    site_pwa_loading_image_url_fold_cover: next.site_pwa_loading_image_url_fold_cover?.trim() || null,
    site_pwa_loading_image_url_tablet: next.site_pwa_loading_image_url_tablet?.trim() || null,
    site_pwa_loading_image_url_tablet_ultra:
      next.site_pwa_loading_image_url_tablet_ultra?.trim() || null,
    site_pwa_loading_duration_ms: normalizePwaLoadingDurationMs(next.site_pwa_loading_duration_ms),
    site_pwa_loading_image_fullscreen: next.site_pwa_loading_image_fullscreen ?? true,
    site_kakao_in_app_guide_enabled: next.site_kakao_in_app_guide_enabled ?? false,
    site_kakao_in_app_guide_title: next.site_kakao_in_app_guide_title?.trim() || null,
    site_kakao_in_app_guide_message: next.site_kakao_in_app_guide_message?.trim() || null,
    site_kakao_in_app_guide_button_label:
      next.site_kakao_in_app_guide_button_label?.trim() || null,
    site_kakao_in_app_guide_samsung_button_label:
      next.site_kakao_in_app_guide_samsung_button_label?.trim() || null,
    site_kakao_in_app_guide_safari_button_label:
      next.site_kakao_in_app_guide_safari_button_label?.trim() || null,
    site_kakao_in_app_guide_ios_popup_title:
      next.site_kakao_in_app_guide_ios_popup_title?.trim() || null,
    site_kakao_in_app_guide_ios_popup_message:
      next.site_kakao_in_app_guide_ios_popup_message?.trim() || null,
    site_kakao_in_app_guide_ios_popup_steps:
      next.site_kakao_in_app_guide_ios_popup_steps?.trim() || null,
    site_kakao_in_app_guide_ios_safari_open_label:
      next.site_kakao_in_app_guide_ios_safari_open_label?.trim() || null,
    site_safari_browser_guide_enabled: next.site_safari_browser_guide_enabled ?? false,
    site_safari_browser_guide_title: next.site_safari_browser_guide_title?.trim() || null,
    site_safari_browser_guide_message: next.site_safari_browser_guide_message?.trim() || null,
    site_safari_browser_guide_steps: next.site_safari_browser_guide_steps?.trim() || null,
    site_safari_browser_guide_button_label:
      next.site_safari_browser_guide_button_label?.trim() || null,
    site_samsung_browser_guide_enabled: next.site_samsung_browser_guide_enabled ?? false,
    site_samsung_browser_guide_title: next.site_samsung_browser_guide_title?.trim() || null,
    site_samsung_browser_guide_message: next.site_samsung_browser_guide_message?.trim() || null,
    site_samsung_browser_guide_chrome_button_label:
      next.site_samsung_browser_guide_chrome_button_label?.trim() || null,
    site_samsung_browser_guide_button_label:
      next.site_samsung_browser_guide_button_label?.trim() || null,
    site_samsung_browser_guide_open_button_label:
      next.site_samsung_browser_guide_open_button_label?.trim() || null,
    site_pwa_back_exit_enabled: next.site_pwa_back_exit_enabled ?? false,
    site_pwa_back_exit_message: next.site_pwa_back_exit_message?.trim() || null,
    site_pwa_back_exit_timeout_ms: normalizePwaBackExitTimeoutMs(next.site_pwa_back_exit_timeout_ms),
    site_pwa_back_exit_popup_enabled: next.site_pwa_back_exit_popup_enabled ?? false,
    site_pwa_back_exit_popup_title: next.site_pwa_back_exit_popup_title?.trim() || null,
    site_pwa_back_exit_popup_message: next.site_pwa_back_exit_popup_message?.trim() || null,
    site_pwa_loading_back_exit_enabled: next.site_pwa_loading_back_exit_enabled ?? false,
    site_events_icon_url: next.site_events_icon_url?.trim() || null,
    site_events_label: next.site_events_label?.trim() || null,
    site_events_hint: next.site_events_hint?.trim() || null,
    site_events_notify_message: next.site_events_notify_message?.trim() || null,
    site_pwa_first_run_notification_prompt_enabled:
      next.site_pwa_first_run_notification_prompt_enabled ?? true,
    site_pwa_first_run_location_prompt_enabled:
      next.site_pwa_first_run_location_prompt_enabled ?? true,
    site_pwa_app_settings_enabled: next.site_pwa_app_settings_enabled ?? true,
    site_pwa_app_settings_notification_enabled:
      next.site_pwa_app_settings_notification_enabled ?? true,
    site_pwa_app_settings_location_enabled: next.site_pwa_app_settings_location_enabled ?? true,
    site_pwa_permission_notification_request_title:
      next.site_pwa_permission_notification_request_title?.trim() || null,
    site_pwa_permission_notification_request_message:
      next.site_pwa_permission_notification_request_message?.trim() || null,
    site_pwa_permission_notification_denied_title:
      next.site_pwa_permission_notification_denied_title?.trim() || null,
    site_pwa_permission_notification_denied_message:
      next.site_pwa_permission_notification_denied_message?.trim() || null,
    site_pwa_permission_location_request_title:
      next.site_pwa_permission_location_request_title?.trim() || null,
    site_pwa_permission_location_request_message:
      next.site_pwa_permission_location_request_message?.trim() || null,
    site_pwa_permission_location_denied_title:
      next.site_pwa_permission_location_denied_title?.trim() || null,
    site_pwa_permission_location_denied_message:
      next.site_pwa_permission_location_denied_message?.trim() || null,
    site_pwa_permission_app_notification_denied_message:
      next.site_pwa_permission_app_notification_denied_message?.trim() || null,
    site_pwa_permission_app_location_denied_message:
      next.site_pwa_permission_app_location_denied_message?.trim() || null,
    site_pwa_permission_notification_request_title_ios:
      next.site_pwa_permission_notification_request_title_ios?.trim() || null,
    site_pwa_permission_notification_request_message_ios:
      next.site_pwa_permission_notification_request_message_ios?.trim() || null,
    site_pwa_permission_notification_denied_title_ios:
      next.site_pwa_permission_notification_denied_title_ios?.trim() || null,
    site_pwa_permission_notification_denied_message_ios:
      next.site_pwa_permission_notification_denied_message_ios?.trim() || null,
    site_pwa_permission_location_request_title_ios:
      next.site_pwa_permission_location_request_title_ios?.trim() || null,
    site_pwa_permission_location_request_message_ios:
      next.site_pwa_permission_location_request_message_ios?.trim() || null,
    site_pwa_permission_location_denied_title_ios:
      next.site_pwa_permission_location_denied_title_ios?.trim() || null,
    site_pwa_permission_location_denied_message_ios:
      next.site_pwa_permission_location_denied_message_ios?.trim() || null,
    site_pwa_permission_app_notification_denied_message_ios:
      next.site_pwa_permission_app_notification_denied_message_ios?.trim() || null,
    site_pwa_permission_app_location_denied_message_ios:
      next.site_pwa_permission_app_location_denied_message_ios?.trim() || null,
  };
}

function normalizePwaLoadingDurationMs(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(10000, Math.round(value)));
}

function normalizeSettingsPanelNoticeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}
