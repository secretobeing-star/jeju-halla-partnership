-- 메인 게시판 위치 설정 (개발자 모드 → 메인 설정 패널)

alter table public.site_settings
  add column if not exists main_board_position_enabled boolean not null default false,
  add column if not exists main_board_position_default text not null default 'above';

notify pgrst, 'reload schema';
