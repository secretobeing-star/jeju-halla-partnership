-- 고정 게시글 페이지 유지 (개발자 모드 Beta)
alter table public.site_settings
  add column if not exists board_pinned_persist_pages_enabled boolean not null default false;
