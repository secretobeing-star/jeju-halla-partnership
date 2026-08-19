alter table public.site_settings
  add column if not exists board_pinned_also_in_list_enabled boolean not null default false;

notify pgrst, 'reload schema';
