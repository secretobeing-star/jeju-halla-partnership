-- 확정형 보상(GUARANTEED) + 테스트 예시 보상 삭제
-- 선행: supabase/map-events.sql, supabase/map-events-gifts.sql

alter table public.event_rewards drop constraint if exists event_rewards_type_check;
alter table public.event_rewards
  add constraint event_rewards_type_check
  check (reward_type in ('RANDOM_STEP', 'GUARANTEED', 'COMPLETION'));

delete from public.event_rewards
where reward_name = '테스트';

notify pgrst, 'reload schema';
