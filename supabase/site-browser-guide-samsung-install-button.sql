alter table public.site_settings
  add column if not exists site_samsung_browser_guide_button_label text;

notify pgrst, 'reload schema';
