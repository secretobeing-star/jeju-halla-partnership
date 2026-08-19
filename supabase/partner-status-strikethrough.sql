-- Partner status center line (strikethrough)

alter table public.partners
  add column if not exists benefit_status_strikethrough boolean not null default false;
