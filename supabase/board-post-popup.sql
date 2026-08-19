-- 게시글 팝업(모달) 열기 설정

alter table public.site_settings
  add column if not exists board_post_popup_enabled boolean not null default true;

notify pgrst, 'reload schema';
