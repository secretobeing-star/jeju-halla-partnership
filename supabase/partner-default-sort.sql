-- Main page default partner sort (false = oldest first, true = newest first)

alter table public.site_settings
  add column if not exists partner_default_sort_new boolean not null default false;
