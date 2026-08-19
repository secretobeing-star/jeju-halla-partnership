alter table public.site_settings
  add column if not exists site_kakao_in_app_guide_enabled boolean not null default false,
  add column if not exists site_kakao_in_app_guide_title text,
  add column if not exists site_kakao_in_app_guide_message text,
  add column if not exists site_kakao_in_app_guide_button_label text,
  add column if not exists site_samsung_browser_guide_enabled boolean not null default false,
  add column if not exists site_samsung_browser_guide_title text,
  add column if not exists site_samsung_browser_guide_message text,
  add column if not exists site_pwa_back_exit_enabled boolean not null default false,
  add column if not exists site_pwa_back_exit_message text,
  add column if not exists site_pwa_back_exit_timeout_ms integer not null default 2000;

notify pgrst, 'reload schema';
