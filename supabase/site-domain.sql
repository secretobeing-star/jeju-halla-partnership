-- 메인 도메인(공식 사이트 URL) 설정

alter table public.site_settings
  add column if not exists main_domain text;

notify pgrst, 'reload schema';
