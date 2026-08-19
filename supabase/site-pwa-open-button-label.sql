alter table public.site_settings
  add column if not exists site_pwa_open_button_label text;

notify pgrst, 'reload schema';
