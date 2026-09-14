-- 시즌패스 · 보상 아이템 · 퀘스트
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  bg_image_url text,
  ui_image_url text,
  track_image_url text,
  premium_badge_url text,
  free_pass_image_url text,
  premium_pass_image_url text,
  exp_per_level integer not null default 1000,
  visit_exp integer not null default 100,
  visit_gold integer not null default 10,
  attendance_exp integer not null default 50,
  attendance_gold integer not null default 5,
  premium_gold_price integer not null default 0,
  gold_shop_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_items (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  item_type text not null default 'costume'
    check (item_type in ('gold', 'coupon', 'costume')),
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.season_pass_levels (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  level integer not null,
  required_exp integer not null default 0,
  free_reward_item_id uuid references public.reward_items(id) on delete set null,
  premium_reward_item_id uuid references public.reward_items(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (season_id, level)
);

create table if not exists public.user_season_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  season_id uuid not null references public.seasons(id) on delete cascade,
  level integer not null default 1,
  exp integer not null default 0,
  gold integer not null default 0,
  is_premium boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, season_id)
);

alter table public.seasons
  add column if not exists premium_gold_price integer not null default 0;

alter table public.seasons
  add column if not exists gold_shop_enabled boolean not null default true;

alter table public.seasons
  add column if not exists free_pass_image_url text;

alter table public.seasons
  add column if not exists premium_pass_image_url text;

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  season_id uuid not null references public.seasons(id) on delete cascade,
  level integer not null,
  track text not null check (track in ('free', 'premium')),
  reward_item_id uuid references public.reward_items(id) on delete set null,
  claimed_at timestamptz not null default now(),
  unique (user_id, season_id, level, track)
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  title text not null default '',
  quest_type text not null default 'partner_visit',
  target_count integer not null default 1,
  reward_exp integer not null default 0,
  reward_gold integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_quest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  quest_id uuid not null references public.quests(id) on delete cascade,
  progress integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, quest_id)
);

create table if not exists public.season_visit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  season_id uuid not null references public.seasons(id) on delete cascade,
  partner_id text not null,
  visited_at timestamptz not null default now(),
  unique (user_id, season_id, partner_id)
);

create table if not exists public.season_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  season_id uuid not null references public.seasons(id) on delete cascade,
  attended_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, season_id, attended_on)
);

alter table public.user_inventory
  add column if not exists reward_item_id uuid references public.reward_items(id) on delete set null,
  add column if not exists season_id uuid references public.seasons(id) on delete set null,
  add column if not exists is_equipped boolean not null default false;

create unique index if not exists season_attendance_logs_user_day_idx
  on public.season_attendance_logs (user_id, season_id, attended_on);

create index if not exists season_attendance_logs_user_idx
  on public.season_attendance_logs (user_id, season_id, attended_on desc);

create index if not exists seasons_active_idx on public.seasons (is_active, starts_at, ends_at);
create index if not exists season_pass_levels_season_idx on public.season_pass_levels (season_id, level);
create index if not exists user_season_progress_user_idx on public.user_season_progress (user_id, season_id);
create index if not exists reward_claims_user_idx on public.reward_claims (user_id, season_id);
create index if not exists quests_season_idx on public.quests (season_id, is_active);
create index if not exists user_quest_logs_user_idx on public.user_quest_logs (user_id, quest_id);
create index if not exists season_visit_logs_user_idx on public.season_visit_logs (user_id, season_id);

alter table public.seasons enable row level security;
alter table public.reward_items enable row level security;
alter table public.season_pass_levels enable row level security;
alter table public.user_season_progress enable row level security;
alter table public.reward_claims enable row level security;
alter table public.quests enable row level security;
alter table public.user_quest_logs enable row level security;
alter table public.season_visit_logs enable row level security;
alter table public.season_attendance_logs enable row level security;

drop policy if exists "seasons_public_read" on public.seasons;
create policy "seasons_public_read"
  on public.seasons for select to anon, authenticated using (true);

drop policy if exists "reward_items_public_read" on public.reward_items;
create policy "reward_items_public_read"
  on public.reward_items for select to anon, authenticated using (true);

drop policy if exists "season_pass_levels_public_read" on public.season_pass_levels;
create policy "season_pass_levels_public_read"
  on public.season_pass_levels for select to anon, authenticated using (true);

drop policy if exists "quests_public_read" on public.quests;
create policy "quests_public_read"
  on public.quests for select to anon, authenticated using (true);

notify pgrst, 'reload schema';
