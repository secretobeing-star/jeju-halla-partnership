alter table public.site_settings
  add column if not exists page_background_default_enabled boolean not null default true;

notify pgrst, 'reload schema';
