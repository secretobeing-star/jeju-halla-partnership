-- Halla Pass 지도 연동 다중 이벤트 (탭/핀/스탬프/N회 완주 보상)

create table if not exists public.app_configs (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.app_configs (key, value)
values
  ('default_map_tab_name', '🌿 제휴처'),
  ('default_map_marker_img', '')
on conflict (key) do nothing;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  tab_name text not null default '',
  title text not null default '',
  description text not null default '',
  is_active boolean not null default false,
  max_stamps integer not null default 1,
  step_probabilities jsonb not null default '[]'::jsonb,
  stamp_active_img text,
  stamp_inactive_img text,
  marker_icon_img text,
  banner_img text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_max_stamps_positive check (max_stamps >= 1)
);

create table if not exists public.event_rewards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reward_type text not null,
  category text not null,
  reward_name text not null default '',
  reward_img text,
  item_value text,
  stock integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_rewards_type_check check (reward_type in ('RANDOM_STEP', 'GUARANTEED', 'COMPLETION')),
  constraint event_rewards_category_check check (category in ('CARD_SKIN', 'CARD_STICKER', 'COUPON'))
);

create table if not exists public.event_places (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  partner_id text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, partner_id)
);

create table if not exists public.user_event_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id uuid not null references public.events(id) on delete cascade,
  current_stamps integer not null default 0,
  is_completed boolean not null default false,
  stamped_places jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_id uuid references public.events(id) on delete set null,
  reward_id uuid references public.event_rewards(id) on delete set null,
  category text not null,
  reward_name text not null default '',
  reward_img text,
  item_value text,
  source text not null default 'event',
  created_at timestamptz not null default now()
);

create index if not exists events_active_sort_idx
  on public.events (is_active, sort_order, created_at desc);

create index if not exists event_rewards_event_idx
  on public.event_rewards (event_id, reward_type, sort_order);

create index if not exists event_places_event_idx
  on public.event_places (event_id, sort_order);

create index if not exists user_event_progress_user_idx
  on public.user_event_progress (user_id, event_id);

create index if not exists user_inventory_user_idx
  on public.user_inventory (user_id, created_at desc);

alter table public.app_configs enable row level security;
alter table public.events enable row level security;
alter table public.event_rewards enable row level security;
alter table public.event_places enable row level security;
alter table public.user_event_progress enable row level security;
alter table public.user_inventory enable row level security;

drop policy if exists "app_configs_public_read" on public.app_configs;
create policy "app_configs_public_read"
  on public.app_configs for select to anon, authenticated using (true);

drop policy if exists "app_configs_admin_all" on public.app_configs;
create policy "app_configs_admin_all"
  on public.app_configs for all to authenticated using (true) with check (true);

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read"
  on public.events for select to anon, authenticated using (is_active = true);

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all"
  on public.events for all to authenticated using (true) with check (true);

drop policy if exists "event_rewards_public_read" on public.event_rewards;
create policy "event_rewards_public_read"
  on public.event_rewards for select to anon, authenticated using (
    exists (select 1 from public.events e where e.id = event_rewards.event_id and e.is_active = true)
  );

drop policy if exists "event_rewards_admin_all" on public.event_rewards;
create policy "event_rewards_admin_all"
  on public.event_rewards for all to authenticated using (true) with check (true);

drop policy if exists "event_places_public_read" on public.event_places;
create policy "event_places_public_read"
  on public.event_places for select to anon, authenticated using (
    exists (select 1 from public.events e where e.id = event_places.event_id and e.is_active = true)
  );

drop policy if exists "event_places_admin_all" on public.event_places;
create policy "event_places_admin_all"
  on public.event_places for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
