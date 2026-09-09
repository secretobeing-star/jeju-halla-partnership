-- 도장 쿨타임 종료 푸시를 위한 타이머 상태 컬럼

alter table public.user_event_timer_state
  add column if not exists partner_id text,
  add column if not exists partner_name text,
  add column if not exists client_key text,
  add column if not exists ready_push_sent_at timestamptz;

create index if not exists user_event_timer_state_ready_push_idx
  on public.user_event_timer_state (cooldown_end_time)
  where ready_push_sent_at is null and cooldown_end_time is not null;

notify pgrst, 'reload schema';
