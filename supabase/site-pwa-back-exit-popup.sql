alter table public.site_settings
  add column if not exists site_pwa_back_exit_popup_enabled boolean not null default false,
  add column if not exists site_pwa_back_exit_popup_title text,
  add column if not exists site_pwa_back_exit_popup_message text,
  add column if not exists site_pwa_loading_back_exit_enabled boolean not null default false,
  add column if not exists site_pwa_logo_back_exit_enabled boolean not null default false;

notify pgrst, 'reload schema';
