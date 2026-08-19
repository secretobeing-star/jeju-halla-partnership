-- 상단 브랜드 로고 숨김 · 배경 띠(칩) 숨김

alter table public.site_settings
  add column if not exists site_nav_brand_icon_hidden boolean not null default false,
  add column if not exists site_nav_brand_chip_hidden boolean not null default false;

notify pgrst, 'reload schema';
