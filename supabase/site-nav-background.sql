alter table public.site_settings
  add column if not exists site_nav_background_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists site_nav_background_display_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists site_nav_background_image_url text;

alter table public.site_settings
  add column if not exists site_nav_background_dark_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists site_nav_background_user_toggle_enabled boolean not null default true;

notify pgrst, 'reload schema';
