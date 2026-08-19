-- 상단 네비게이션 브랜드 (로고 · 제목)

alter table public.site_settings
  add column if not exists site_nav_brand_title text,
  add column if not exists site_nav_brand_icon_url text,
  add column if not exists site_nav_brand_link_url text;

notify pgrst, 'reload schema';
