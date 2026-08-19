alter table public.site_settings
  add column if not exists site_admin_pwa_enabled boolean not null default false,
  add column if not exists site_admin_pwa_name text,
  add column if not exists site_admin_pwa_short_name text,
  add column if not exists site_admin_pwa_icon_url text,
  add column if not exists site_admin_pwa_install_prompt_enabled boolean not null default true,
  add column if not exists site_admin_pwa_install_guide_message text,
  add column if not exists site_admin_pwa_install_button_label text;

notify pgrst, 'reload schema';
