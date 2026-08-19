-- 아이폰 미니 등 375px 이하 제휴 목록 별도 설정 (iPhone 12 mini / 13 mini 등)

alter table public.site_settings
  add column if not exists partners_mini_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_mini integer not null default 6,
  add column if not exists partners_grid_columns_mini integer not null default 1,
  add column if not exists partner_benefit_min_height_mini integer not null default 150;

notify pgrst, 'reload schema';
