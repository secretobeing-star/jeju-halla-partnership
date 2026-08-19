-- 메인 페이지 로딩 이미지 (관리자 설정)



alter table public.site_settings

  add column if not exists site_loading_image_url text,

  add column if not exists partners_loading_image_url text;



notify pgrst, 'reload schema';

