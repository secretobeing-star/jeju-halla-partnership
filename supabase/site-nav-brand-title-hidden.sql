-- 상단 브랜드 텍스트 제목 숨김 (로고는 유지)

alter table public.site_settings
  add column if not exists site_nav_brand_title_hidden boolean not null default false;

notify pgrst, 'reload schema';
