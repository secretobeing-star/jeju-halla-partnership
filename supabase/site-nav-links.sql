-- 상단 네비게이션 메뉴 / 검색창 설정

alter table public.site_settings
  add column if not exists site_nav_links jsonb not null default '[]'::jsonb,
  add column if not exists site_nav_enabled boolean not null default true,
  add column if not exists site_nav_search_placeholder text;

notify pgrst, 'reload schema';
