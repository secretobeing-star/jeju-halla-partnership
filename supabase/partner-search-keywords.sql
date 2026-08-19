-- 제휴 업체 검색 키워드 묶음 (관리자 커스텀)
alter table public.site_settings
  add column if not exists partner_search_keyword_groups jsonb not null default '[]'::jsonb;
