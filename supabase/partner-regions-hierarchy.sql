-- 제휴 지역 계층 구조 (동·읍·면) 및 상세 검색 기본 상태

alter table public.site_settings
  add column if not exists partner_region_filter_default_expanded boolean not null default false;

update public.site_settings
set partner_regions = jsonb_build_array(
  jsonb_build_object(
    'id', 'jeju-city',
    'label', '제주시',
    'areas', jsonb_build_array('제원', '아라', '연동', '노형', '이도', '삼도', '오라', '기타')
  ),
  jsonb_build_object(
    'id', 'seogwipo-city',
    'label', '서귀포시',
    'areas', jsonb_build_array('중문', '서귀동', '대정', '남원', '표선', '성산', '기타')
  )
)
where id = 1
  and (
    partner_regions is null
    or partner_regions = '[]'::jsonb
    or jsonb_typeof(partner_regions->0) = 'string'
  );

update public.partners
set region = '제주시/' || region
where region is not null
  and region <> ''
  and position('/' in region) = 0;

notify pgrst, 'reload schema';
