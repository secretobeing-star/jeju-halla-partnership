-- 제휴 도장 EXP/골드 + 최소~최대 범위
-- 선행: supabase/map-events.sql

alter table public.events
  add column if not exists stamp_exp integer not null default 100,
  add column if not exists stamp_gold integer not null default 10;

alter table public.events add column if not exists stamp_exp_min integer;
alter table public.events add column if not exists stamp_exp_max integer;
alter table public.events add column if not exists stamp_gold_min integer;
alter table public.events add column if not exists stamp_gold_max integer;

update public.events
set
  stamp_exp_min = coalesce(stamp_exp_min, stamp_exp, 100),
  stamp_exp_max = coalesce(stamp_exp_max, stamp_exp, 100),
  stamp_gold_min = coalesce(stamp_gold_min, stamp_gold, 10),
  stamp_gold_max = coalesce(stamp_gold_max, stamp_gold, 10);

alter table public.events
  alter column stamp_exp_min set default 100,
  alter column stamp_exp_max set default 100,
  alter column stamp_gold_min set default 10,
  alter column stamp_gold_max set default 10;

alter table public.events
  alter column stamp_exp_min set not null,
  alter column stamp_exp_max set not null,
  alter column stamp_gold_min set not null,
  alter column stamp_gold_max set not null;

notify pgrst, 'reload schema';
