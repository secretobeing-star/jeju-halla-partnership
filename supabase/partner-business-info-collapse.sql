-- 제휴 카드 영업 정보 접기/펼치기 기본 상태 (admin > 혜택 설정)

alter table public.site_settings
  add column if not exists partner_business_info_default_expanded boolean not null default false;

notify pgrst, 'reload schema';
