alter table public.site_settings
  add column if not exists admin_partners_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_partners_per_page integer not null default 10;

notify pgrst, 'reload schema';
