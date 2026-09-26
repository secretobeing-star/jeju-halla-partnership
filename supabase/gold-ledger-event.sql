-- 골드 획득 경로에 이벤트를 추가합니다. Supabase SQL Editor에서 실행하세요.

alter table public.gold_ledger
  drop constraint if exists gold_ledger_source_check;

alter table public.gold_ledger
  add constraint gold_ledger_source_check
  check (source in (
    'attendance',
    'visit',
    'event',
    'quest',
    'claim',
    'shop_spend',
    'shop_reward',
    'gacha',
    'premium',
    'admin'
  ));

notify pgrst, 'reload schema';
