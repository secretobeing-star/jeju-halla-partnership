-- Missing site_settings columns catch-up (safe to re-run)
-- Supabase SQL Editor → New query → Run

alter table public.site_settings
  add column if not exists notice_badge_label text;

alter table public.site_settings
  add column if not exists notice_carousel_auto_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists notice_carousel_auto_interval_seconds integer not null default 5;

alter table public.site_settings
  add column if not exists board_pinned_persist_pages_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_pinned_also_in_list_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_partners_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_partners_per_page integer not null default 10;

alter table public.site_settings
  add column if not exists board_secret_comments_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_admin_secret_comments_main_visible_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_admin_secret_reply_parent_unlock_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_list_font_size_compact integer not null default 10;

alter table public.site_settings
  add column if not exists board_list_font_size_desktop integer not null default 11;

alter table public.site_settings
  add column if not exists board_post_detail_font_size integer not null default 16;

alter table public.site_settings
  add column if not exists settings_panel_notice_text text;

alter table public.site_settings
  add column if not exists settings_panel_notice_url text;

alter table public.site_settings
  add column if not exists partner_benefit_box_bg_color text;

alter table public.site_settings
  add column if not exists partner_benefit_box_border_color text;

alter table public.site_settings
  add column if not exists board_sort_views_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists board_list_refresh_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists board_id_mode_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists footer_text_color text,
  add column if not exists settings_panel_notice_color text;

alter table public.site_settings
  add column if not exists settings_panel_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_posts_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_posts_per_page integer not null default 10;

alter table public.site_settings
  add column if not exists board_page_create_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists partners_tablet_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_tablet integer not null default 9,
  add column if not exists partners_grid_columns_tablet integer not null default 3,
  add column if not exists partner_benefit_min_height_tablet integer not null default 175;

alter table public.site_settings
  add column if not exists partner_regions jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists partner_region_filter_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists partner_region_filter_default_expanded boolean not null default false;

alter table public.site_settings
  add column if not exists partner_business_info_default_expanded boolean not null default false;

alter table public.site_settings
  add column if not exists main_site_size_floating_enabled boolean not null default false;

alter table public.board_comments
  add column if not exists is_secret boolean not null default false;

alter table public.partners
  add column if not exists region text;

notify pgrst, 'reload schema';
