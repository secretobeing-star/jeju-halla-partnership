-- Board list refresh button toggle (admin > 게시글 분류 > 게시글 기능 설정)

alter table public.site_settings
  add column if not exists board_list_refresh_enabled boolean not null default true;

notify pgrst, 'reload schema';
