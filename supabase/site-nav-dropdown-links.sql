-- 제목 드롭다운 전용 메뉴 (상단 가로 메뉴와 별도 관리)
alter table public.site_settings
  add column if not exists site_nav_dropdown_enabled boolean not null default true,
  add column if not exists site_nav_dropdown_links jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
