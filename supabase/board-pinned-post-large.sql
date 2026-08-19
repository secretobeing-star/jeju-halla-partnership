-- 고정 게시글 목록 강조(크게 표시) 설정
alter table public.site_settings
  add column if not exists board_pinned_post_large_enabled boolean not null default false;
