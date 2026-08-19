alter table public.site_settings
  add column if not exists site_pwa_enabled boolean not null default false,
  add column if not exists site_pwa_name text,
  add column if not exists site_pwa_short_name text,
  add column if not exists site_pwa_icon_url text,
  add column if not exists site_pwa_theme_color text,
  add column if not exists site_pwa_background_color text,
  add column if not exists site_pwa_install_prompt_enabled boolean not null default true,
  add column if not exists site_pwa_install_guide_message text,
  add column if not exists site_pwa_install_guide_steps text,
  add column if not exists site_pwa_install_button_label text,
  add column if not exists site_pwa_loading_enabled boolean not null default true,
  add column if not exists site_pwa_loading_message text,
  add column if not exists site_pwa_loading_image_url text,
  add column if not exists site_pwa_loading_duration_ms integer not null default 0,
  add column if not exists site_pwa_loading_image_fullscreen boolean not null default true,
  add column if not exists site_pwa_first_run_notification_prompt_enabled boolean not null default true,
  add column if not exists site_pwa_first_run_location_prompt_enabled boolean not null default true,
  add column if not exists site_pwa_app_settings_enabled boolean not null default true,
  add column if not exists site_pwa_app_settings_notification_enabled boolean not null default true,
  add column if not exists site_pwa_app_settings_location_enabled boolean not null default true;

notify pgrst, 'reload schema';
