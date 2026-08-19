-- 상단 메뉴 배경 밝/어두 테마 (사이트 다크 모드와 별도)

alter table public.site_settings
  add column if not exists site_nav_background_dark_enabled boolean not null default false;

notify pgrst, 'reload schema';
