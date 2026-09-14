-- 시즌패스 출석 체크

alter table public.seasons
  add column if not exists attendance_exp integer not null default 50,
  add column if not exists attendance_gold integer not null default 5;

create table if not exists public.season_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  season_id uuid not null references public.seasons(id) on delete cascade,
  attended_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, season_id, attended_on)
);

create index if not exists season_attendance_logs_user_idx
  on public.season_attendance_logs (user_id, season_id, attended_on desc);

alter table public.season_attendance_logs enable row level security;

notify pgrst, 'reload schema';
