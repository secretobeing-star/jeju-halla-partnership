-- 폴드·태블릿(768~1279px) 제휴 목록 별도 설정

alter table public.site_settings
  add column if not exists partners_tablet_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_tablet integer not null default 9,
  add column if not exists partners_grid_columns_tablet integer not null default 3,
  add column if not exists partner_benefit_min_height_tablet integer not null default 175;

notify pgrst, 'reload schema';
