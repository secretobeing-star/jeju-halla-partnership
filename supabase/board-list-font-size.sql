-- Board list / detail font size settings (admin)

alter table public.site_settings
  add column if not exists board_list_font_size_compact integer not null default 10;

alter table public.site_settings
  add column if not exists board_list_font_size_desktop integer not null default 11;

alter table public.site_settings
  add column if not exists board_post_detail_font_size integer not null default 16;

notify pgrst, 'reload schema';
