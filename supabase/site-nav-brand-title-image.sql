-- 상단 브랜드 제목 이미지 (로고와 별도)

alter table public.site_settings
  add column if not exists site_nav_brand_title_image_url text;

notify pgrst, 'reload schema';
