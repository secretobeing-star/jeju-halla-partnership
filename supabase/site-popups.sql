create table if not exists public.site_popups (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image_url text,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_popups_active_sort_idx
  on public.site_popups (is_active, sort_order, created_at desc);

alter table public.site_popups enable row level security;

drop policy if exists "site_popups_public_read" on public.site_popups;
create policy "site_popups_public_read"
  on public.site_popups
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "site_popups_admin_all" on public.site_popups;
create policy "site_popups_admin_all"
  on public.site_popups
  for all
  to authenticated
  using (true)
  with check (true);
