-- 상단 브랜드 클릭 시 새로고침

alter table public.site_settings
  add column if not exists site_nav_brand_link_refresh_enabled boolean not null default false;

notify pgrst, 'reload schema';
