-- 메인 화면 카테고리·지도 레이아웃

alter table public.site_settings
  add column if not exists partner_category_section_enabled boolean not null default true,
  add column if not exists main_partner_map_position text not null default 'above_list',
  add column if not exists main_category_region_user_toggle_enabled boolean not null default true,
  add column if not exists main_map_user_toggle_enabled boolean not null default true;

notify pgrst, 'reload schema';
