-- ============================================================
-- [1단계] 이 파일만 먼저 실행하세요. (Run 전체)
-- Supabase → SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create schema if not exists public;

create table public.site_settings (
  id integer primary key,
  header_title text not null,
  header_sub text not null,
  notice_text text not null,
  banner_image_url text,
  sidebar_left_image_url text,
  sidebar_left_link_url text,
  sidebar_right_image_url text,
  sidebar_right_link_url text,
  header_title_color text,
  header_title_link_url text,
  mobile_ad_below_hero_image_url text,
  mobile_ad_below_hero_link_url text,
  mobile_ad_below_category_image_url text,
  mobile_ad_below_category_link_url text
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  address text not null,
  benefit text not null,
  image_url text,
  instagram_url text,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.site_settings (
  id,
  header_title,
  header_sub,
  notice_text
) values (
  1,
  '2026 제주한라대학교 제41대 다온 제휴 리스트',
  '제주한라대 학생을 위한 제주 지역 제휴 혜택을 한곳에서 확인하세요.',
  ''
);

-- RLS
alter table public.site_settings enable row level security;
alter table public.partners enable row level security;

create policy "site_settings_public_read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings_admin_write"
  on public.site_settings for all
  to authenticated
  using (true)
  with check (true);

create policy "partners_public_read"
  on public.partners for select
  to anon, authenticated
  using (is_active = true);

create policy "partners_admin_all"
  on public.partners for all
  to authenticated
  using (true)
  with check (true);
