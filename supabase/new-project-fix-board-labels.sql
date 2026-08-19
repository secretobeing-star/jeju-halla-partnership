-- Quick fix if new-project-full.sql failed at board-definitions.sql (42703)
-- Run this in SQL Editor, then continue from board-definitions.sql onward
-- (or re-run the regenerated new-project-full.sql on a fresh project)

alter table public.site_settings
  add column if not exists board_notice_label text not null default '공지',
  add column if not exists board_free_label text not null default '자유게시판',
  add column if not exists board_inquiry_label text not null default '건의/문의',
  add column if not exists board_definitions jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
