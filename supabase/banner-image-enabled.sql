-- 메인 타이틀 이미지 표시 on/off (이미지 URL은 유지)
alter table public.site_settings
  add column if not exists banner_image_enabled boolean not null default true;

notify pgrst, 'reload schema';
