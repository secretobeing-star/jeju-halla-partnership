alter table public.site_settings
  add column if not exists site_safari_browser_guide_enabled boolean not null default false,
  add column if not exists site_safari_browser_guide_title text,
  add column if not exists site_safari_browser_guide_message text,
  add column if not exists site_safari_browser_guide_steps text,
  add column if not exists site_safari_browser_guide_button_label text;

notify pgrst, 'reload schema';
