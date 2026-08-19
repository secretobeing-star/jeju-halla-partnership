alter table public.site_settings
  add column if not exists partner_benefit_min_height_mobile integer not null default 150,
  add column if not exists partner_benefit_min_height_desktop integer not null default 200;
