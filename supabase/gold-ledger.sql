-- 골드 획득·사용 원장. Supabase SQL Editor에서 실행하세요.

create table if not exists public.gold_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  season_id uuid,
  amount integer not null,
  source text not null check (source in (
    'attendance',
    'visit',
    'quest',
    'claim',
    'shop_spend',
    'shop_reward',
    'premium',
    'admin'
  )),
  created_at timestamptz not null default now()
);

create index if not exists gold_ledger_created_idx
  on public.gold_ledger (created_at desc);

create index if not exists gold_ledger_source_created_idx
  on public.gold_ledger (source, created_at desc);

alter table public.gold_ledger enable row level security;

alter table public.gold_ledger
  drop constraint if exists gold_ledger_source_check;

alter table public.gold_ledger
  add constraint gold_ledger_source_check
  check (source in (
    'attendance',
    'visit',
    'quest',
    'claim',
    'shop_spend',
    'shop_reward',
    'premium',
    'admin'
  ));

notify pgrst, 'reload schema';
