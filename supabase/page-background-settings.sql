alter table public.site_settings
  add column if not exists page_background_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists page_background_color text;

alter table public.site_settings
  add column if not exists page_background_image_url text;

notify pgrst, 'reload schema';
