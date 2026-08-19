-- 멀티 이벤트 + 탭 (이미지/문구/링크)
create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_event_tabs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.site_events(id) on delete cascade,
  label text not null default '',
  body_text text,
  image_url text,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_events_active_sort_idx
  on public.site_events (is_active, sort_order, created_at desc);

create index if not exists site_event_tabs_event_sort_idx
  on public.site_event_tabs (event_id, is_active, sort_order, created_at desc);

alter table public.site_events enable row level security;
alter table public.site_event_tabs enable row level security;

drop policy if exists "site_events_public_read" on public.site_events;
create policy "site_events_public_read"
  on public.site_events
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "site_events_admin_all" on public.site_events;
create policy "site_events_admin_all"
  on public.site_events
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "site_event_tabs_public_read" on public.site_event_tabs;
create policy "site_event_tabs_public_read"
  on public.site_event_tabs
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.site_events e
      where e.id = site_event_tabs.event_id
        and e.is_active = true
    )
  );

drop policy if exists "site_event_tabs_admin_all" on public.site_event_tabs;
create policy "site_event_tabs_admin_all"
  on public.site_event_tabs
  for all
  to authenticated
  using (true)
  with check (true);

alter table public.site_settings
  add column if not exists site_events_icon_url text;

notify pgrst, 'reload schema';
