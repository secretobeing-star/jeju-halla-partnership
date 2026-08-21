-- 이벤트 타이머 상태 및 인트로 확인 상태 관리 테이블
-- 기기/계정당 도장 쿨다운 타이머와 인트로 확인 상태를 DB에 저장

create table if not exists public.user_event_timer_state (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id uuid not null references public.events(id) on delete cascade,
  cooldown_end_time timestamptz,
  intro_confirmed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists user_event_timer_state_user_idx
  on public.user_event_timer_state (user_id, event_id);

alter table public.user_event_timer_state enable row level security;

drop policy if exists "user_event_timer_state_user_all" on public.user_event_timer_state;
create policy "user_event_timer_state_user_all"
  on public.user_event_timer_state for all to authenticated using (true) with check (true);

drop policy if exists "user_event_timer_state_admin_all" on public.user_event_timer_state;
create policy "user_event_timer_state_admin_all"
  on public.user_event_timer_state for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';