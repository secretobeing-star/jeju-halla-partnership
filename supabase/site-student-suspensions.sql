-- 학번 정지. Supabase SQL Editor에서 실행하세요.

create table if not exists public.site_student_suspensions (
  student_id text primary key,
  reason text not null default '',
  until timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_student_suspensions_until_idx
  on public.site_student_suspensions (until);

alter table if exists public.site_student_suspensions disable row level security;

notify pgrst, 'reload schema';
