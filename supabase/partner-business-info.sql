-- 제휴 업체 영업 정보 (영업시간, 휴무일 등)

alter table public.partners
  add column if not exists business_info text;

notify pgrst, 'reload schema';
