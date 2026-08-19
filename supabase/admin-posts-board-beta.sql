-- Developer Mode Beta: admin posts list pagination + board page creation

alter table public.site_settings
  add column if not exists admin_posts_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_posts_per_page integer not null default 10;

alter table public.site_settings
  add column if not exists board_page_create_enabled boolean not null default false;

notify pgrst, 'reload schema';
