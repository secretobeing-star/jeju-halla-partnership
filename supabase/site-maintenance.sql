-- Site maintenance notice on main page

alter table public.site_settings
  add column if not exists site_maintenance_text text,
  add column if not exists site_maintenance_image_url text,
  add column if not exists site_maintenance_enabled boolean not null default false;
