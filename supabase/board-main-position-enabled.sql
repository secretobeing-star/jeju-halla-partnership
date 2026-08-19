-- 메인 게시판 위치 설정 on/off (끄면 제휴 목록 아래 고정)

alter table public.site_settings
  add column if not exists board_main_position_enabled boolean not null default true;

notify pgrst, 'reload schema';
