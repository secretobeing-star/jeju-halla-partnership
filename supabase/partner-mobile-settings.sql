-- 모바일(767px 이하) 제휴 목록 별도 설정

alter table public.site_settings
  add column if not exists partners_mobile_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_mobile integer not null default 6,
  add column if not exists partners_grid_columns_mobile integer not null default 1;

notify pgrst, 'reload schema';
