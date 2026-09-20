-- 일일 접속 보상

create table if not exists public.site_login_reward_settings (
  id integer primary key default 1,
  enabled boolean not null default false,
  gold_amount integer not null default 10,
  push_enabled boolean not null default true,
  push_title text not null default '오늘의 접속 보상',
  push_body text not null default '접속 보상이 지급되었습니다. 확인해 보세요!',
  costume_frame_id text,
  coupon_code text,
  updated_at timestamptz not null default now()
);

alter table if exists public.site_login_reward_settings
  add column if not exists costume_frame_id text,
  add column if not exists coupon_code text,
  add column if not exists schedule_mode text not null default 'on_login',
  add column if not exists send_hour integer not null default 9,
  add column if not exists send_minute integer not null default 0,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists weekdays text,
  add column if not exists last_dispatched_on date;

insert into public.site_login_reward_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.site_login_reward_claims (
  student_id text not null,
  claimed_on date not null,
  gold_amount integer not null default 0,
  costume_frame_id text,
  coupon_code text,
  created_at timestamptz not null default now(),
  primary key (student_id, claimed_on)
);

alter table if exists public.site_login_reward_claims
  add column if not exists costume_frame_id text,
  add column if not exists coupon_code text;

create index if not exists site_login_reward_claims_day_idx
  on public.site_login_reward_claims (claimed_on desc);

alter table if exists public.site_login_reward_settings disable row level security;
alter table if exists public.site_login_reward_claims disable row level security;

notify pgrst, 'reload schema';
