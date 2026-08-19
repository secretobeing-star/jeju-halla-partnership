-- 제휴업체 지역 설정 및 partners.region 컬럼

alter table public.partners
  add column if not exists region text;

alter table public.site_settings
  add column if not exists partner_regions jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists partner_region_filter_enabled boolean not null default true;

update public.site_settings
set partner_regions = jsonb_build_array(
  '제원',
  '아라',
  '연동',
  '노형',
  '이도',
  '삼도',
  '오라',
  '기타'
)
where id = 1
  and (
    partner_regions is null
    or partner_regions = '[]'::jsonb
    or jsonb_array_length(partner_regions) = 0
  );

notify pgrst, 'reload schema';
