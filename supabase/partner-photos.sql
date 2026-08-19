-- 제휴 업체 상세 갤러리 사진 (대표 image_url 외 추가 사진)

create table if not exists public.partner_photos (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists partner_photos_partner_sort_idx
  on public.partner_photos (partner_id, sort_order, created_at);

alter table public.partner_photos enable row level security;

drop policy if exists "partner_photos_public_read" on public.partner_photos;
create policy "partner_photos_public_read"
  on public.partner_photos for select to anon, authenticated
  using (true);

drop policy if exists "partner_photos_admin_all" on public.partner_photos;
create policy "partner_photos_admin_all"
  on public.partner_photos for all to authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
