-- 제휴 지도 「내 위치」 버튼 표시

alter table public.site_settings
  add column if not exists partner_map_locate_enabled boolean not null default true;

notify pgrst, 'reload schema';
