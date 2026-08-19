-- 와이드·4K(1920px+) 제휴 목록 별도 설정

alter table public.site_settings
  add column if not exists partners_wide_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_wide integer not null default 12;

notify pgrst, 'reload schema';
