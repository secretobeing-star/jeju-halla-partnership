-- 제휴업체 카테고리 설정
alter table public.site_settings
  add column if not exists partner_categories jsonb not null default '[]'::jsonb;

update public.site_settings
set partner_categories = jsonb_build_array(
  '음식점',
  '요리주점/바(BAR)',
  '카페/디저트',
  '뷰티/헤어',
  '생활/의료/기타'
)
where id = 1
  and (
    partner_categories is null
    or partner_categories = '[]'::jsonb
    or jsonb_array_length(partner_categories) = 0
  );
