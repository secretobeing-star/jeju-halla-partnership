-- 제휴 업체 자세히 보기 상세 설명

alter table public.partners
  add column if not exists detail_description text;

notify pgrst, 'reload schema';
