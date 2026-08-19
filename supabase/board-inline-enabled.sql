-- 메인 본문 게시판 표시 on/off

alter table public.site_settings
  add column if not exists board_inline_enabled boolean not null default true;

notify pgrst, 'reload schema';
