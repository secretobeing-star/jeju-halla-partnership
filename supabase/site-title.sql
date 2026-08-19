-- 브라우저 탭 사이트 제목 설정
alter table public.site_settings
  add column if not exists site_title text;

alter table public.site_settings
  add column if not exists admin_site_title text;
