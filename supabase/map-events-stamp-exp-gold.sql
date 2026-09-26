-- 제휴 도장 EXP/골드: 시즌패스 → 지도 이벤트
-- 선행: supabase/map-events.sql

alter table public.events
  add column if not exists stamp_exp integer not null default 100,
  add column if not exists stamp_gold integer not null default 10;

notify pgrst, 'reload schema';
