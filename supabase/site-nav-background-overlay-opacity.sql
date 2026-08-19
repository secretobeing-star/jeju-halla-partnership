alter table public.site_settings
  add column if not exists site_nav_background_dark_overlay_opacity integer not null default 82;

notify pgrst, 'reload schema';
