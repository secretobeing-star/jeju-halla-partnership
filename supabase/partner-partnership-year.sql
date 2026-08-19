-- Partnership year: filter partners by academic/council year

alter table public.partners
  add column if not exists partnership_year smallint;

alter table public.site_settings
  add column if not exists partner_year_filter_enabled boolean not null default true;

create index if not exists partners_partnership_year_idx
  on public.partners (partnership_year);

notify pgrst, 'reload schema';
