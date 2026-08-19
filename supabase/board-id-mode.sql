-- Developer mode: board ID editing in admin (게시글 분류 > 게시판별 목록 설정)

alter table public.site_settings
  add column if not exists board_id_mode_enabled boolean not null default false;

notify pgrst, 'reload schema';
