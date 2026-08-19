-- 제휴 업체 지도: 주소 API(지오코딩) 활성화/비활성화

alter table public.site_settings
  add column if not exists partner_map_geocode_api_enabled boolean not null default true,
  add column if not exists partner_map_geocode_naver_enabled boolean not null default true,
  add column if not exists partner_map_geocode_tamna_enabled boolean not null default true,
  add column if not exists partner_map_geocode_nominatim_enabled boolean not null default true;

notify pgrst, 'reload schema';
