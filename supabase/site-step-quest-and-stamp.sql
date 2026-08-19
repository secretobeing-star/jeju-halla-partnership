-- 스텝 퀘스트 설정 + 감사 로그

alter table public.site_settings
  add column if not exists site_step_quest jsonb;

create table if not exists public.site_step_quest_logs (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  student_name text,
  action text not null,
  step_id text,
  frame_id text,
  ip text,
  user_agent text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists site_step_quest_logs_student_idx
  on public.site_step_quest_logs (student_id, created_at desc);

-- 이벤트 스탬프 퀘스트 설정 (이벤트 행 jsonb)
alter table public.site_events
  add column if not exists stamp_quest jsonb;

create table if not exists public.site_event_stamp_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  student_id text not null,
  student_name text,
  action text not null,
  stamps integer,
  ip text,
  user_agent text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists site_event_stamp_logs_event_student_idx
  on public.site_event_stamp_logs (event_id, student_id, created_at desc);

notify pgrst, 'reload schema';
