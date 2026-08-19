-- ============================================================
-- Jeju Halla Partnership — full database setup
-- Supabase Dashboard → SQL Editor → New query → paste all → Run
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================


-- ------------------------------------------------------------
-- 1. site_settings
-- ------------------------------------------------------------
create table if not exists public.site_settings (
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
  mobile_ad_below_category_link_url text,
  free_board_enabled boolean not null default true,
  inquiry_board_enabled boolean not null default true,
  notice_text_enabled boolean not null default false
);

alter table public.site_settings
  add column if not exists banner_image_url text,
  add column if not exists sidebar_left_image_url text,
  add column if not exists sidebar_left_link_url text,
  add column if not exists sidebar_right_image_url text,
  add column if not exists sidebar_right_link_url text,
  add column if not exists header_title_color text,
  add column if not exists header_title_link_url text,
  add column if not exists mobile_ad_below_hero_image_url text,
  add column if not exists mobile_ad_below_hero_link_url text,
  add column if not exists mobile_ad_below_category_image_url text,
  add column if not exists mobile_ad_below_category_link_url text,
  add column if not exists free_board_enabled boolean not null default true,
  add column if not exists inquiry_board_enabled boolean not null default true,
  add column if not exists notice_text_enabled boolean not null default false;

insert into public.site_settings (id, header_title, header_sub, notice_text, notice_text_enabled)
values (
  1,
  '2026 제주한라대학교 제41대 다온 제휴 리스트',
  '제주한라대 학생을 위한 제주 지역 제휴 혜택을 한곳에서 확인하세요.',
  '',
  false
)
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 2. partners
-- ------------------------------------------------------------
create table if not exists public.partners (
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

alter table public.partners
  add column if not exists instagram_url text;


-- ------------------------------------------------------------
-- 3. board_posts
-- ------------------------------------------------------------
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  board_type text not null check (board_type in ('notice', 'free', 'inquiry')),
  title text not null,
  content text not null default '',
  author_name text not null,
  password_hash text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.board_posts
  add column if not exists password_hash text;

create index if not exists board_posts_type_created_idx
  on public.board_posts (board_type, created_at desc);


-- ------------------------------------------------------------
-- 4. RLS — site_settings
-- ------------------------------------------------------------
alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings for all
  to authenticated
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 5. RLS — partners
-- ------------------------------------------------------------
alter table public.partners enable row level security;

drop policy if exists "partners_public_read" on public.partners;
create policy "partners_public_read"
  on public.partners for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "partners_admin_all" on public.partners;
create policy "partners_admin_all"
  on public.partners for all
  to authenticated
  using (true)
  with check (true);


-- ------------------------------------------------------------
-- 6. RLS — board_posts
-- ------------------------------------------------------------
alter table public.board_posts enable row level security;

drop policy if exists "board_posts_public_read" on public.board_posts;
create policy "board_posts_public_read"
  on public.board_posts for select
  to anon, authenticated
  using (is_hidden = false);

drop policy if exists "board_posts_public_insert" on public.board_posts;
create policy "board_posts_public_insert"
  on public.board_posts for insert
  to anon, authenticated
  with check (board_type in ('free', 'inquiry'));

drop policy if exists "board_posts_admin_select" on public.board_posts;
create policy "board_posts_admin_select"
  on public.board_posts for select
  to authenticated
  using (true);

drop policy if exists "board_posts_admin_insert" on public.board_posts;
create policy "board_posts_admin_insert"
  on public.board_posts for insert
  to authenticated
  with check (true);

drop policy if exists "board_posts_admin_update" on public.board_posts;
create policy "board_posts_admin_update"
  on public.board_posts for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "board_posts_admin_delete" on public.board_posts;
create policy "board_posts_admin_delete"
  on public.board_posts for delete
  to authenticated
  using (true);


-- ------------------------------------------------------------
-- 7. Storage bucket (images)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('partnership-images', 'partnership-images', true)
on conflict (id) do update set public = true;

drop policy if exists "partnership_images_public_read" on storage.objects;
create policy "partnership_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_upload" on storage.objects;
create policy "partnership_images_admin_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_update" on storage.objects;
create policy "partnership_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'partnership-images')
  with check (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_delete" on storage.objects;
create policy "partnership_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'partnership-images');


-- ------------------------------------------------------------
-- 8. board_comments table + RPC (댓글)
-- ------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_name text not null,
  content text not null,
  password_hash text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists board_comments_post_created_idx
  on public.board_comments (post_id, created_at asc);

alter table public.board_comments enable row level security;

drop policy if exists "board_comments_public_read" on public.board_comments;
create policy "board_comments_public_read"
  on public.board_comments for select to anon, authenticated
  using (is_hidden = false);

drop policy if exists "board_comments_admin_all" on public.board_comments;
create policy "board_comments_admin_all"
  on public.board_comments for all to authenticated
  using (true) with check (true);

drop function if exists public.create_user_board_comment(uuid, text, text, text);
drop function if exists public.update_user_board_comment(uuid, text, text, text);
drop function if exists public.delete_user_board_comment(uuid, text);

create or replace function public.create_user_board_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  post_hidden boolean;
begin
  select is_hidden into post_hidden from board_posts where id = p_post_id;

  if post_hidden is null then
    raise exception 'Post not found';
  end if;

  if post_hidden then
    raise exception 'Post not found';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into board_comments (post_id, author_name, content, password_hash)
  values (
    p_post_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_user_board_comment(
  p_id uuid,
  p_password text,
  p_author_name text,
  p_content text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash from board_comments where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  update board_comments
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  where id = p_id;

  return true;
end;
$$;

create or replace function public.delete_user_board_comment(
  p_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash from board_comments where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  delete from board_comments where id = p_id;
  return true;
end;
$$;

grant usage on schema extensions to anon, authenticated;

grant execute on function public.create_user_board_comment(uuid, text, text, text) to anon, authenticated;
grant execute on function public.update_user_board_comment(uuid, text, text, text) to anon, authenticated;
grant execute on function public.delete_user_board_comment(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
