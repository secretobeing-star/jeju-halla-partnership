-- 로그인 창 로고 이미지

alter table public.site_settings
  add column if not exists site_login_logo_url text;

notify pgrst, 'reload schema';
