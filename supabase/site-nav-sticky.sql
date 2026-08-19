-- 상단 메뉴 / 검색창 스크롤 고정 설정

alter table public.site_settings
  add column if not exists site_nav_sticky_enabled boolean not null default true;

notify pgrst, 'reload schema';
