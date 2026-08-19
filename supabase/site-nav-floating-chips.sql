alter table public.site_settings
  add column if not exists site_nav_floating_chips_enabled boolean not null default false,
  add column if not exists site_nav_floating_chips_user_toggle_enabled boolean not null default true;

notify pgrst, 'reload schema';
