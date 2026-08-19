-- 사이트 파비콘(브라우저 탭 아이콘) 설정
alter table public.site_settings
  add column if not exists site_favicon_url text;
