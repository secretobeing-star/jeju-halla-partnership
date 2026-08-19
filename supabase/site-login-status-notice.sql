-- 로그인 창 노란색 안내 문구 (관리자 직접 입력)

alter table public.site_settings
  add column if not exists site_login_status_notice text;

notify pgrst, 'reload schema';
