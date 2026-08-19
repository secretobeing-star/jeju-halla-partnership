-- 숨김 게시글 안내 제목/내용 (관리자 설정)

alter table public.site_settings
  add column if not exists board_hidden_post_title text,
  add column if not exists board_hidden_post_message text;

notify pgrst, 'reload schema';
