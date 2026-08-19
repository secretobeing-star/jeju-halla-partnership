-- 메인 페이지 로딩 문구 (관리자 설정)



alter table public.site_settings

  add column if not exists site_loading_message text,

  add column if not exists partners_loading_message text;



notify pgrst, 'reload schema';

