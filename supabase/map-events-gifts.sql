-- 지도 이벤트: 기간/GPS/쿨타임 + 선물함·테두리 보관함 연동
-- 선행: supabase/map-events.sql 실행 후 이 파일을 실행하세요.

alter table public.events
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists radius_meters integer not null default 30,
  add column if not exists cooldown_minutes integer not null default 0,
  add column if not exists guide_text text,
  add column if not exists win_message text,
  add column if not exists lose_message text,
  add column if not exists completion_message text;

alter table public.event_rewards
  add column if not exists frame_css_value text;

alter table public.user_event_progress
  add column if not exists last_stamped_at timestamptz;

insert into public.app_configs (key, value)
values
  ('default_map_tab_name', '🌿 제휴처'),
  ('default_map_marker_img', ''),
  ('default_tab_name', '🌿 제휴처'),
  ('default_marker_img', ''),
  ('default_benefit_btn_label', '자세히 보기'),
  ('event_stamp_btn_label', '도장 찍기')
on conflict (key) do nothing;

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  place_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create table if not exists public.user_gifts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  reward_id uuid references public.event_rewards(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  reward_name text not null default '',
  reward_img text,
  frame_css_value text,
  is_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create table if not exists public.user_frames (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  frame_id text not null,
  acquired_at timestamptz not null default now()
);

create index if not exists user_favorites_user_idx on public.user_favorites (user_id, created_at desc);
create index if not exists user_gifts_user_idx on public.user_gifts (user_id, is_claimed, created_at desc);
create index if not exists user_frames_user_idx on public.user_frames (user_id, acquired_at desc);

alter table public.user_favorites enable row level security;
alter table public.user_gifts enable row level security;
alter table public.user_frames enable row level security;

notify pgrst, 'reload schema';
