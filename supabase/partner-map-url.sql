-- 제휴 업체 지도 공유 링크 (네이버 지도 등)

alter table public.partners
  add column if not exists map_url text;

notify pgrst, 'reload schema';
