-- Custom footer text on main page

alter table public.site_settings
  add column if not exists footer_text text,
  add column if not exists footer_text_enabled boolean not null default false,
  add column if not exists footer_link_label text,
  add column if not exists footer_link_url text;
