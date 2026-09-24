-- 골드상점 확률성 아이템(뽑기)

create table if not exists public.gold_shop_gacha_boxes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade,
  name text not null default '확률 상자',
  price_gold integer not null default 0,
  original_price_gold integer not null default 0,
  badge_label text not null default '',
  fx_enabled boolean not null default true,
  idle_image_url text,
  burst_image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gold_shop_gacha_rewards (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.gold_shop_gacha_boxes(id) on delete cascade,
  kind text not null default 'costume' check (kind in ('costume', 'gold', 'coupon')),
  name text not null default '',
  probability numeric not null default 0,
  gold_amount integer not null default 0,
  frame_id text,
  coupon_code text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gold_shop_gacha_pulls (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  box_id uuid not null references public.gold_shop_gacha_boxes(id) on delete cascade,
  reward_id uuid references public.gold_shop_gacha_rewards(id) on delete set null,
  gold_spent integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gold_shop_gacha_boxes_active_idx
  on public.gold_shop_gacha_boxes (is_active, sort_order);

create index if not exists gold_shop_gacha_rewards_box_idx
  on public.gold_shop_gacha_rewards (box_id, kind, is_active, sort_order);

create index if not exists gold_shop_gacha_pulls_user_idx
  on public.gold_shop_gacha_pulls (user_id, box_id);

alter table if exists public.gold_shop_gacha_boxes
  add column if not exists open_place text not null default 'shop';

alter table if exists public.gold_shop_gacha_boxes
  add column if not exists layout_count integer not null default 1;

alter table if exists public.gold_shop_gacha_boxes
  add column if not exists confirm_popup boolean not null default true;

alter table public.gold_shop_gacha_boxes enable row level security;
alter table public.gold_shop_gacha_rewards enable row level security;
alter table public.gold_shop_gacha_pulls enable row level security;

drop policy if exists "gold_shop_gacha_boxes_public_read" on public.gold_shop_gacha_boxes;
create policy "gold_shop_gacha_boxes_public_read"
  on public.gold_shop_gacha_boxes for select to anon, authenticated using (true);

drop policy if exists "gold_shop_gacha_rewards_public_read" on public.gold_shop_gacha_rewards;
create policy "gold_shop_gacha_rewards_public_read"
  on public.gold_shop_gacha_rewards for select to anon, authenticated using (true);

alter table if exists public.gold_shop_gacha_boxes
  add column if not exists updated_at timestamptz not null default now();

grant all on table public.gold_shop_gacha_boxes to service_role;
grant all on table public.gold_shop_gacha_rewards to service_role;
grant all on table public.gold_shop_gacha_pulls to service_role;

notify pgrst, 'reload schema';
