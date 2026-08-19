-- 학생 보상(선물함) — 관리자가 테두리 등 지급

create table if not exists public.site_student_rewards (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  reward_type text not null default 'frame',
  frame_id text,
  title text,
  message text,
  status text not null default 'pending',
  created_by text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists site_student_rewards_student_status_idx
  on public.site_student_rewards (student_id, status, created_at desc);

create index if not exists site_student_rewards_created_idx
  on public.site_student_rewards (created_at desc);

notify pgrst, 'reload schema';
