-- 개발자 모드 저장 오류 시 Supabase SQL Editor에서 이 파일을 실행하세요.
-- (Could not find the '...' column of 'site_settings' in the schema cache)

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

alter table public.board_comments
  add column if not exists is_secret boolean not null default false;

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
  add column if not exists partners_mobile_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_mobile integer not null default 6,
  add column if not exists partners_grid_columns_mobile integer not null default 1;

alter table public.site_settings
  add column if not exists partners_mini_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_mini integer not null default 6,
  add column if not exists partners_grid_columns_mini integer not null default 1,
  add column if not exists partner_benefit_min_height_mini integer not null default 150;

alter table public.site_settings
  add column if not exists partners_tablet_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_tablet integer not null default 9,
  add column if not exists partners_grid_columns_tablet integer not null default 3,
  add column if not exists partner_benefit_min_height_tablet integer not null default 175;

alter table public.partners
  add column if not exists region text;

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

alter table public.site_settings
  add column if not exists site_nav_links jsonb not null default '[]'::jsonb,
  add column if not exists site_nav_enabled boolean not null default true,
  add column if not exists site_nav_sticky_enabled boolean not null default true,
  add column if not exists site_nav_search_placeholder text;

alter table public.site_settings
  add column if not exists board_inline_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists board_mobile_media_upload_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists site_nav_dropdown_enabled boolean not null default true,
  add column if not exists site_nav_dropdown_links jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists board_device_moderation_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists site_nav_floating_chips_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists site_kakao_in_app_guide_ios_popup_title text,
  add column if not exists site_kakao_in_app_guide_ios_popup_message text,
  add column if not exists site_kakao_in_app_guide_ios_popup_steps text,
  add column if not exists site_kakao_in_app_guide_ios_safari_open_label text;

alter table public.site_settings
  add column if not exists site_safari_browser_guide_enabled boolean not null default false,
  add column if not exists site_safari_browser_guide_title text,
  add column if not exists site_safari_browser_guide_message text,
  add column if not exists site_safari_browser_guide_steps text,
  add column if not exists site_safari_browser_guide_button_label text;

alter table public.site_settings
  add column if not exists site_events_icon_url text,
  add column if not exists site_events_label text,
  add column if not exists site_events_hint text,
  add column if not exists site_events_notify_message text;

alter table public.site_settings
  add column if not exists site_student_card_frames jsonb;

alter table public.site_settings
  add column if not exists site_student_card_school_logo_url text,
  add column if not exists site_student_card_school_name text,
  add column if not exists site_student_card_center_image_url text,
  add column if not exists site_student_card_center_image_opacity double precision,
  add column if not exists site_student_card_background_url text,
  add column if not exists site_student_card_background_opacity double precision;

alter table public.site_settings
  add column if not exists site_step_quest jsonb;

alter table public.site_events
  add column if not exists stamp_quest jsonb;

-- 학생 보상(선물함)
create table if not exists public.site_student_rewards (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  reward_type text not null default 'frame',
  frame_id text,
  title text,
  message text,
  status text not null default 'pending',
  created_by text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists site_student_rewards_student_status_idx
  on public.site_student_rewards (student_id, status, created_at desc);

-- 학생별 카드 테두리 설정 + 탈퇴 후 14일 재가입 차단
create table if not exists public.site_student_card_settings (
  student_id text primary key,
  equipped_frame_id text,
  unlocked_ids jsonb not null default '[]'::jsonb,
  sources jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists site_student_card_settings_updated_idx
  on public.site_student_card_settings (updated_at desc);

create table if not exists public.site_member_withdrawal_blocks (
  student_id text primary key,
  student_name text,
  withdrawn_at timestamptz not null default now(),
  rejoin_allowed_at timestamptz not null
);

create index if not exists site_member_withdrawal_blocks_rejoin_idx
  on public.site_member_withdrawal_blocks (rejoin_allowed_at);

alter table if exists public.site_student_card_settings disable row level security;
alter table if exists public.site_member_withdrawal_blocks disable row level security;

-- 관리자 보상 지급 감사 로그
create table if not exists public.site_reward_distribution_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  admin_name text,
  target_user_id text not null,
  target_user_name text,
  reward_type text not null default 'FRAME',
  reward_id text not null,
  reward_name text,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists site_reward_distribution_logs_created_idx
  on public.site_reward_distribution_logs (created_at desc);

create index if not exists site_reward_distribution_logs_admin_idx
  on public.site_reward_distribution_logs (admin_id, created_at desc);

create index if not exists site_reward_distribution_logs_target_idx
  on public.site_reward_distribution_logs (target_user_id, created_at desc);

notify pgrst, 'reload schema';
