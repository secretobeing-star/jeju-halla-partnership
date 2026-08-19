-- ============================================================
-- Jeju Halla Partnership — NEW Supabase project bootstrap
-- Generated: 2026-07-21T11:00:50.432Z
-- Run in Supabase Dashboard → SQL Editor (may need 2–3 batches if too large)
-- ============================================================


-- >>> BEGIN setup-all.sql

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

-- <<< END setup-all.sql



-- >>> BEGIN fix-storage-rls.sql

-- Fix partnership-images storage bucket and RLS policies
-- Run in Supabase SQL Editor if uploads fail with "row-level security policy"

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partnership-images', 'partnership-images', true, 52428800, null)
on conflict (id) do update
set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = null;

-- storage.objects RLS는 Supabase에서 기본 활성화됨 (alter table 불필요)

drop policy if exists "partnership_images_public_read" on storage.objects;
create policy "partnership_images_public_read"
  on storage.objects for select
  to public
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

-- 게시글 이미지·동영상: 비로그인 사용자도 업로드 허용
drop policy if exists "partnership_images_board_upload" on storage.objects;
create policy "partnership_images_board_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'partnership-images'
    and (
      name like 'board-images/%'
      or name like 'board-videos/%'
      or (storage.foldername(name))[1] in ('board-images', 'board-videos')
    )
  );

drop policy if exists "partnership_images_board_update" on storage.objects;
create policy "partnership_images_board_update"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'partnership-images'
    and (
      name like 'board-images/%'
      or name like 'board-videos/%'
      or (storage.foldername(name))[1] in ('board-images', 'board-videos')
    )
  )
  with check (
    bucket_id = 'partnership-images'
    and (
      name like 'board-images/%'
      or name like 'board-videos/%'
      or (storage.foldername(name))[1] in ('board-images', 'board-videos')
    )
  );

notify pgrst, 'reload schema';

-- <<< END fix-storage-rls.sql



-- >>> BEGIN board-rpc.sql

-- Run in Supabase SQL Editor (entire script)

create extension if not exists pgcrypto with schema extensions;

alter table public.board_posts
  add column if not exists password_hash text;

drop function if exists public.create_user_board_post(text, text, text, text, text);
drop function if exists public.update_user_board_post(uuid, text, text, text, text);
drop function if exists public.delete_user_board_post(uuid, text);

create or replace function public.create_user_board_post(
  p_board_type text,
  p_title text,
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
begin
  if p_board_type not in ('free', 'inquiry') then
    raise exception 'Invalid board type';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into board_posts (board_type, title, author_name, content, password_hash)
  values (
    p_board_type,
    trim(p_title),
    trim(p_author_name),
    p_content,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_user_board_post(
  p_id uuid,
  p_password text,
  p_title text,
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
  stored_type text;
begin
  select password_hash, board_type
  into stored_hash, stored_type
  from board_posts
  where id = p_id;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if stored_type not in ('free', 'inquiry') then
    raise exception 'This post cannot be edited here';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  update board_posts
  set
    title = trim(p_title),
    author_name = trim(p_author_name),
    content = p_content,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  where id = p_id;

  return true;
end;
$$;

create or replace function public.delete_user_board_post(
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
  stored_type text;
begin
  select password_hash, board_type
  into stored_hash, stored_type
  from board_posts
  where id = p_id;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if stored_type not in ('free', 'inquiry') then
    raise exception 'This post cannot be deleted here';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  delete from board_posts where id = p_id;
  return true;
end;
$$;

grant usage on schema extensions to anon, authenticated;

grant execute on function public.create_user_board_post(text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_user_board_post(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_user_board_post(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END board-rpc.sql



-- >>> BEGIN board-labels.sql

alter table public.site_settings
  add column if not exists board_notice_label text not null default '공지',
  add column if not exists board_free_label text not null default '자유게시판',
  add column if not exists board_inquiry_label text not null default '건의/문의';

-- <<< END board-labels.sql



-- >>> BEGIN board-settings.sql

alter table public.site_settings
  add column if not exists free_board_enabled boolean not null default true,
  add column if not exists inquiry_board_enabled boolean not null default true,
  add column if not exists notice_text_enabled boolean not null default false,
  add column if not exists admin_comment_delete_protected boolean not null default true,
  add column if not exists partner_benefit_min_height_mobile integer not null default 150,
  add column if not exists partner_benefit_min_height_desktop integer not null default 200,
  add column if not exists board_notice_label text not null default '공지',
  add column if not exists board_free_label text not null default '자유게시판',
  add column if not exists board_inquiry_label text not null default '건의/문의',
  add column if not exists board_definitions jsonb not null default '[]'::jsonb;

-- <<< END board-settings.sql



-- >>> BEGIN board-definitions.sql

-- Dynamic board definitions (add/remove/rename boards from admin)

alter table public.site_settings
  add column if not exists board_notice_label text not null default '공지',
  add column if not exists board_free_label text not null default '자유게시판',
  add column if not exists board_inquiry_label text not null default '건의/문의',
  add column if not exists board_definitions jsonb not null default '[]'::jsonb;

alter table public.board_posts
  drop constraint if exists board_posts_board_type_check;

drop policy if exists "board_posts_public_insert" on public.board_posts;
create policy "board_posts_public_insert"
  on public.board_posts for insert to anon, authenticated
  with check (false);

create or replace function public.is_user_writable_board(p_board_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_settings s,
         jsonb_array_elements(coalesce(s.board_definitions, '[]'::jsonb)) elem
    where s.id = 1
      and elem->>'id' = p_board_type
      and coalesce((elem->>'enabled')::boolean, true) = true
      and coalesce((elem->>'allow_user_posts')::boolean, false) = true
  );
$$;

drop function if exists public.create_user_board_post(text, text, text, text, text);
drop function if exists public.update_user_board_post(uuid, text, text, text, text);
drop function if exists public.delete_user_board_post(uuid, text);

create or replace function public.create_user_board_post(
  p_board_type text,
  p_title text,
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
begin
  if not public.is_user_writable_board(p_board_type) then
    raise exception 'Invalid board type';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into board_posts (board_type, title, author_name, content, password_hash)
  values (
    p_board_type,
    trim(p_title),
    trim(p_author_name),
    p_content,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_user_board_post(
  p_id uuid,
  p_password text,
  p_title text,
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
  stored_type text;
begin
  select password_hash, board_type
  into stored_hash, stored_type
  from board_posts
  where id = p_id;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if not public.is_user_writable_board(stored_type) then
    raise exception 'This post cannot be edited here';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  update board_posts
  set
    title = trim(p_title),
    author_name = trim(p_author_name),
    content = p_content,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  where id = p_id;

  return true;
end;
$$;

create or replace function public.delete_user_board_post(
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
  stored_type text;
begin
  select password_hash, board_type
  into stored_hash, stored_type
  from board_posts
  where id = p_id;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if not public.is_user_writable_board(stored_type) then
    raise exception 'This post cannot be deleted here';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  delete from board_posts where id = p_id;
  return true;
end;
$$;

grant execute on function public.is_user_writable_board(text) to anon, authenticated;
grant execute on function public.create_user_board_post(text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_user_board_post(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_user_board_post(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END board-definitions.sql



-- >>> BEGIN boards-and-settings.sql

-- Same as setup-all.sql — run this file OR setup-all.sql (not both required)
-- Supabase Dashboard → SQL Editor → paste all → Run

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

alter table public.site_settings enable row level security;
alter table public.partners enable row level security;
alter table public.board_posts enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings for all to authenticated using (true) with check (true);

drop policy if exists "partners_public_read" on public.partners;
create policy "partners_public_read"
  on public.partners for select to anon, authenticated using (is_active = true);

drop policy if exists "partners_admin_all" on public.partners;
create policy "partners_admin_all"
  on public.partners for all to authenticated using (true) with check (true);

drop policy if exists "board_posts_public_read" on public.board_posts;
create policy "board_posts_public_read"
  on public.board_posts for select to anon, authenticated using (is_hidden = false);

drop policy if exists "board_posts_public_insert" on public.board_posts;
create policy "board_posts_public_insert"
  on public.board_posts for insert to anon, authenticated
  with check (board_type in ('free', 'inquiry'));

drop policy if exists "board_posts_admin_select" on public.board_posts;
create policy "board_posts_admin_select"
  on public.board_posts for select to authenticated using (true);

drop policy if exists "board_posts_admin_insert" on public.board_posts;
create policy "board_posts_admin_insert"
  on public.board_posts for insert to authenticated with check (true);

drop policy if exists "board_posts_admin_update" on public.board_posts;
create policy "board_posts_admin_update"
  on public.board_posts for update to authenticated using (true) with check (true);

drop policy if exists "board_posts_admin_delete" on public.board_posts;
create policy "board_posts_admin_delete"
  on public.board_posts for delete to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('partnership-images', 'partnership-images', true)
on conflict (id) do update set public = true;

drop policy if exists "partnership_images_public_read" on storage.objects;
create policy "partnership_images_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_upload" on storage.objects;
create policy "partnership_images_admin_upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_update" on storage.objects;
create policy "partnership_images_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'partnership-images')
  with check (bucket_id = 'partnership-images');

drop policy if exists "partnership_images_admin_delete" on storage.objects;
create policy "partnership_images_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'partnership-images');

-- <<< END boards-and-settings.sql



-- >>> BEGIN board-comments.sql

-- Run in Supabase SQL Editor (after board-rpc.sql)

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

-- <<< END board-comments.sql



-- >>> BEGIN comment-replies.sql

-- Run in Supabase SQL Editor (after board-comments.sql)

alter table public.board_comments
  add column if not exists parent_id uuid references public.board_comments(id) on delete cascade;

create index if not exists board_comments_parent_created_idx
  on public.board_comments (parent_id, created_at asc);

drop function if exists public.create_user_board_comment(uuid, text, text, text);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid);

create or replace function public.create_user_board_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  post_hidden boolean;
  parent_post_id uuid;
  parent_hidden boolean;
begin
  select is_hidden into post_hidden from board_posts where id = p_post_id;

  if post_hidden is null or post_hidden then
    raise exception 'Post not found';
  end if;

  if p_parent_id is not null then
    select post_id, is_hidden
    into parent_post_id, parent_hidden
    from board_comments
    where id = p_parent_id;

    if parent_post_id is null or parent_hidden then
      raise exception 'Parent comment not found';
    end if;

    if parent_post_id <> p_post_id then
      raise exception 'Parent comment not found';
    end if;
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into board_comments (post_id, parent_id, author_name, content, password_hash)
  values (
    p_post_id,
    p_parent_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_user_board_comment(uuid, text, text, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END comment-replies.sql



-- >>> BEGIN comment-nested-replies.sql

-- Run in Supabase SQL Editor to allow nested replies (reply to reply)

drop function if exists public.create_user_board_comment(uuid, text, text, text);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid);

create or replace function public.create_user_board_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  post_hidden boolean;
  parent_post_id uuid;
  parent_hidden boolean;
begin
  select is_hidden into post_hidden from board_posts where id = p_post_id;

  if post_hidden is null or post_hidden then
    raise exception 'Post not found';
  end if;

  if p_parent_id is not null then
    select post_id, is_hidden
    into parent_post_id, parent_hidden
    from board_comments
    where id = p_parent_id;

    if parent_post_id is null or parent_hidden then
      raise exception 'Parent comment not found';
    end if;

    if parent_post_id <> p_post_id then
      raise exception 'Parent comment not found';
    end if;
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into board_comments (post_id, parent_id, author_name, content, password_hash)
  values (
    p_post_id,
    p_parent_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_user_board_comment(uuid, text, text, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END comment-nested-replies.sql



-- >>> BEGIN admin-comment-protection.sql

-- Run in Supabase SQL Editor

alter table public.site_settings
  add column if not exists admin_comment_delete_protected boolean not null default true;

alter table public.board_comments
  add column if not exists is_admin_managed boolean not null default false;

update public.board_comments
set is_admin_managed = true
where password_hash = 'admin-managed';

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

  if stored_hash = 'admin-managed' then
    raise exception 'Cannot delete admin comment';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  delete from board_comments where id = p_id;
  return true;
end;
$$;

grant execute on function public.delete_user_board_comment(uuid, text) to anon, authenticated;

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
  comment_admin_managed boolean;
begin
  select password_hash, coalesce(is_admin_managed, false)
  into stored_hash, comment_admin_managed
  from board_comments
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if stored_hash = 'admin-managed' or comment_admin_managed then
    raise exception 'Cannot update admin comment';
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

grant execute on function public.update_user_board_comment(uuid, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END admin-comment-protection.sql



-- >>> BEGIN board-password.sql

alter table public.board_posts
  add column if not exists password_hash text;

-- <<< END board-password.sql



-- >>> BEGIN board-sort-views.sql

-- Board sort by views toggle (admin > 게시글 분류 > 게시글 기능 설정)

alter table public.site_settings
  add column if not exists board_sort_views_enabled boolean not null default true;

notify pgrst, 'reload schema';

-- <<< END board-sort-views.sql



-- >>> BEGIN board-post-views.sql

-- Board post view counts (Developer Mode toggle)

alter table public.site_settings
  add column if not exists board_post_views_enabled boolean not null default false;

alter table public.board_posts
  add column if not exists view_count integer not null default 0;

create or replace function public.is_board_post_views_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select board_post_views_enabled from public.site_settings where id = 1 limit 1),
    false
  );
$$;

create or replace function public.increment_board_post_view(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
  post_hidden boolean;
begin
  if not public.is_board_post_views_enabled() then
    select view_count into next_count
    from board_posts
    where id = p_post_id;

    return coalesce(next_count, 0);
  end if;

  select is_hidden into post_hidden
  from board_posts
  where id = p_post_id;

  if post_hidden then
    raise exception 'Post not found';
  end if;

  update board_posts
  set view_count = view_count + 1
  where id = p_post_id
  returning view_count into next_count;

  return coalesce(next_count, 0);
end;
$$;

grant execute on function public.is_board_post_views_enabled() to anon, authenticated;
grant execute on function public.increment_board_post_view(uuid) to anon, authenticated;

-- <<< END board-post-views.sql



-- >>> BEGIN board-pinned-posts.sql

-- Pinned board posts (admin toggle in 게시글 관리)

alter table public.board_posts
  add column if not exists is_pinned boolean not null default false;

alter table public.board_posts
  add column if not exists pinned_at timestamptz;

create index if not exists board_posts_pinned_idx
  on public.board_posts (board_type, is_pinned desc, pinned_at desc nulls last, created_at desc);

-- <<< END board-pinned-posts.sql



-- >>> BEGIN board-pinned-also-in-list.sql

alter table public.site_settings
  add column if not exists board_pinned_also_in_list_enabled boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END board-pinned-also-in-list.sql



-- >>> BEGIN board-pinned-persist-pages.sql

-- 고정 게시글 페이지 유지 (개발자 모드 Beta)
alter table public.site_settings
  add column if not exists board_pinned_persist_pages_enabled boolean not null default false;

-- <<< END board-pinned-persist-pages.sql



-- >>> BEGIN board-pinned-post-large.sql

-- 고정 게시글 목록 강조(크게 표시) 설정
alter table public.site_settings
  add column if not exists board_pinned_post_large_enabled boolean not null default false;

-- <<< END board-pinned-post-large.sql



-- >>> BEGIN board-list-font-size.sql

-- Board list / detail font size settings (admin)

alter table public.site_settings
  add column if not exists board_list_font_size_compact integer not null default 10;

alter table public.site_settings
  add column if not exists board_list_font_size_desktop integer not null default 11;

alter table public.site_settings
  add column if not exists board_post_detail_font_size integer not null default 16;

notify pgrst, 'reload schema';

-- <<< END board-list-font-size.sql



-- >>> BEGIN board-list-refresh.sql

-- Board list refresh button toggle (admin > 게시글 분류 > 게시글 기능 설정)

alter table public.site_settings
  add column if not exists board_list_refresh_enabled boolean not null default true;

notify pgrst, 'reload schema';

-- <<< END board-list-refresh.sql



-- >>> BEGIN board-hidden-post-message.sql

-- 숨김 게시글 안내 제목/내용 (관리자 설정)

alter table public.site_settings
  add column if not exists board_hidden_post_title text,
  add column if not exists board_hidden_post_message text;

notify pgrst, 'reload schema';

-- <<< END board-hidden-post-message.sql



-- >>> BEGIN board-admin-posts.sql

-- Admin-managed board posts (hide user password edit/delete on public site)

alter table public.board_posts
  add column if not exists is_admin_managed boolean not null default false;

update public.board_posts
set is_admin_managed = true
where password_hash is null;

notify pgrst, 'reload schema';

-- <<< END board-admin-posts.sql



-- >>> BEGIN board-id-mode.sql

-- Developer mode: board ID editing in admin (게시글 분류 > 게시판별 목록 설정)

alter table public.site_settings
  add column if not exists board_id_mode_enabled boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END board-id-mode.sql



-- >>> BEGIN board-section-header-color.sql

-- 게시판 헤더(게시판/접기 영역) 색상 설정
alter table public.site_settings
  add column if not exists board_section_header_color text;

-- <<< END board-section-header-color.sql



-- >>> BEGIN feature-update-v1.sql

-- Feature update v1: ads, title toggles, reactions, partner dates, board settings

alter table public.site_settings
  add column if not exists header_title_enabled boolean not null default true,
  add column if not exists banner_image_only boolean not null default false,
  add column if not exists bottom_pc_ad_image_url text,
  add column if not exists bottom_pc_ad_link_url text,
  add column if not exists post_reactions_enabled boolean not null default true,
  add column if not exists board_sort_latest_enabled boolean not null default true,
  add column if not exists board_sort_recommended_enabled boolean not null default true,
  add column if not exists board_collapsible_enabled boolean not null default true,
  add column if not exists partner_sort_old_enabled boolean not null default true,
  add column if not exists partner_sort_new_enabled boolean not null default true,
  add column if not exists pagination_scroll_top_enabled boolean not null default true,
  add column if not exists partners_per_page integer not null default 8;

alter table public.partners
  add column if not exists benefit_start_date date,
  add column if not exists benefit_end_date date;

alter table public.board_posts
  add column if not exists like_count integer not null default 0,
  add column if not exists dislike_count integer not null default 0;

create table if not exists public.board_post_votes (
  post_id uuid not null references public.board_posts(id) on delete cascade,
  voter_key text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (post_id, voter_key)
);

alter table public.board_post_votes enable row level security;

drop policy if exists "board_post_votes_public_read" on public.board_post_votes;
create policy "board_post_votes_public_read"
  on public.board_post_votes for select to anon, authenticated using (true);

create or replace function public.react_board_post(
  p_post_id uuid,
  p_reaction text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_reaction text;
  new_likes integer;
  new_dislikes integer;
begin
  if p_reaction not in ('like', 'dislike') then
    raise exception 'Invalid reaction';
  end if;

  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (select 1 from board_posts where id = p_post_id and is_hidden = false) then
    raise exception 'Post not found';
  end if;

  select reaction into prev_reaction
  from board_post_votes
  where post_id = p_post_id and voter_key = p_voter_key;

  if prev_reaction is null then
    insert into board_post_votes (post_id, voter_key, reaction)
    values (p_post_id, p_voter_key, p_reaction);

    if p_reaction = 'like' then
      update board_posts set like_count = like_count + 1 where id = p_post_id;
    else
      update board_posts set dislike_count = dislike_count + 1 where id = p_post_id;
    end if;
  elsif prev_reaction = p_reaction then
    delete from board_post_votes where post_id = p_post_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update board_posts set like_count = greatest(like_count - 1, 0) where id = p_post_id;
    else
      update board_posts set dislike_count = greatest(dislike_count - 1, 0) where id = p_post_id;
    end if;
  else
    update board_post_votes
    set reaction = p_reaction
    where post_id = p_post_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update board_posts
      set like_count = like_count + 1, dislike_count = greatest(dislike_count - 1, 0)
      where id = p_post_id;
    else
      update board_posts
      set dislike_count = dislike_count + 1, like_count = greatest(like_count - 1, 0)
      where id = p_post_id;
    end if;
  end if;

  select like_count, dislike_count
  into new_likes, new_dislikes
  from board_posts
  where id = p_post_id;

  return jsonb_build_object(
    'like_count', new_likes,
    'dislike_count', new_dislikes,
    'reaction', (
      select reaction from board_post_votes
      where post_id = p_post_id and voter_key = p_voter_key
    )
  );
end;
$$;

grant execute on function public.react_board_post(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END feature-update-v1.sql



-- >>> BEGIN board-developer-mode-stubs.sql

-- Stubs/columns needed before secret post/comment SQL runs.
-- developer-mode-beta.sql later replaces is_admin_user_password_visible().

alter table public.board_posts
  add column if not exists admin_visible_password text;

alter table public.board_comments
  add column if not exists admin_visible_password text;

create or replace function public.is_admin_user_password_visible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

notify pgrst, 'reload schema';

-- <<< END board-developer-mode-stubs.sql



-- >>> BEGIN board-secret-posts.sql

-- Secret board posts (Developer Mode Beta)

alter table public.site_settings
  add column if not exists board_secret_posts_enabled boolean not null default false;

alter table public.board_posts
  add column if not exists is_secret boolean not null default false;

create or replace function public.is_board_secret_posts_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select board_secret_posts_enabled from public.site_settings where id = 1 limit 1),
    false
  );
$$;

drop function if exists public.create_user_board_post(text, text, text, text, text);
drop function if exists public.create_user_board_post(text, text, text, text, text, boolean);

create or replace function public.create_user_board_post(
  p_board_type text,
  p_title text,
  p_author_name text,
  p_content text,
  p_password text,
  p_is_secret boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  store_admin_password boolean;
  secret_enabled boolean;
begin
  if not public.is_user_writable_board(p_board_type) then
    raise exception 'Invalid board type';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  secret_enabled := public.is_board_secret_posts_enabled();
  if coalesce(p_is_secret, false) and not secret_enabled then
    raise exception 'Secret posts are disabled';
  end if;

  store_admin_password := public.is_admin_user_password_visible();

  insert into board_posts (
    board_type,
    title,
    author_name,
    content,
    password_hash,
    admin_visible_password,
    is_secret
  )
  values (
    p_board_type,
    trim(p_title),
    trim(p_author_name),
    p_content,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when store_admin_password then p_password else null end,
    case when secret_enabled then coalesce(p_is_secret, false) else false end
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.unlock_secret_board_post(
  p_id uuid,
  p_password text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  post_content text;
  post_secret boolean;
  post_hidden boolean;
begin
  select password_hash, content, is_secret, is_hidden
  into stored_hash, post_content, post_secret, post_hidden
  from board_posts
  where id = p_id;

  if stored_hash is null or post_hidden then
    raise exception 'Post not found';
  end if;

  if not coalesce(post_secret, false) then
    return post_content;
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  return post_content;
end;
$$;

grant execute on function public.create_user_board_post(text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.unlock_secret_board_post(uuid, text) to anon, authenticated;

-- <<< END board-secret-posts.sql



-- >>> BEGIN board-hidden-posts-public.sql

-- 숨김 게시글도 목록에 포함(본문은 노출하지 않음). 메인에서 안내 문구 표시용.

create or replace function public.list_board_posts_for_display(
  p_board_type text default null,
  p_pinned_only boolean default false,
  p_board_types text[] default null
)
returns table (
  id uuid,
  board_type text,
  title text,
  author_name text,
  is_hidden boolean,
  is_secret boolean,
  is_pinned boolean,
  pinned_at timestamptz,
  like_count integer,
  dislike_count integer,
  view_count integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.board_type,
    p.title,
    p.author_name,
    p.is_hidden,
    coalesce(p.is_secret, false) as is_secret,
    coalesce(p.is_pinned, false) as is_pinned,
    p.pinned_at,
    coalesce(p.like_count, 0) as like_count,
    coalesce(p.dislike_count, 0) as dislike_count,
    coalesce(p.view_count, 0) as view_count,
    p.created_at
  from public.board_posts p
  where
    case
      when p_pinned_only then
        coalesce(p.is_pinned, false) = true
        and (p_board_types is null or p.board_type = any(p_board_types))
      else
        p.board_type = p_board_type
    end
  order by
    case when p_pinned_only then p.pinned_at end desc nulls last,
    p.created_at desc;
$$;

revoke all on function public.list_board_posts_for_display(text, boolean, text[]) from public;
grant execute on function public.list_board_posts_for_display(text, boolean, text[]) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END board-hidden-posts-public.sql



-- >>> BEGIN board-secret-comments.sql

-- Secret board comments / replies (Developer Mode Beta)

alter table public.site_settings
  add column if not exists board_secret_comments_enabled boolean not null default false;

alter table public.board_comments
  add column if not exists is_secret boolean not null default false;

-- Stub until board-secret-comment-developer-features.sql replaces with settings-backed version
create or replace function public.is_board_admin_secret_comments_main_visible_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

create or replace function public.is_board_secret_comments_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select board_secret_comments_enabled from public.site_settings where id = 1 limit 1),
    false
  );
$$;

create or replace function public.get_board_post_comments(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  parent_id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  is_admin_managed boolean,
  is_secret boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.post_id,
    c.parent_id,
    c.author_name,
    case
      when coalesce(c.is_secret, false)
        and coalesce(c.is_admin_managed, false)
        and public.is_board_admin_secret_comments_main_visible_enabled() then c.content
      when coalesce(c.is_secret, false) then null
      else c.content
    end as content,
    c.is_hidden,
    coalesce(c.is_admin_managed, false) as is_admin_managed,
    coalesce(c.is_secret, false) as is_secret,
    c.created_at
  from board_comments c
  where c.post_id = p_post_id
    and c.is_hidden = false
  order by c.created_at asc;
$$;

drop function if exists public.create_user_board_comment(uuid, text, text, text);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid, boolean);

create or replace function public.create_user_board_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_parent_id uuid default null,
  p_is_secret boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  post_hidden boolean;
  parent_post_id uuid;
  parent_hidden boolean;
  store_admin_password boolean;
  secret_enabled boolean;
begin
  select is_hidden into post_hidden from board_posts where id = p_post_id;

  if post_hidden is null or post_hidden then
    raise exception 'Post not found';
  end if;

  if p_parent_id is not null then
    select post_id, is_hidden
    into parent_post_id, parent_hidden
    from board_comments
    where id = p_parent_id;

    if parent_post_id is null or parent_hidden then
      raise exception 'Parent comment not found';
    end if;

    if parent_post_id <> p_post_id then
      raise exception 'Parent comment not found';
    end if;
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  secret_enabled := public.is_board_secret_comments_enabled();
  if coalesce(p_is_secret, false) and not secret_enabled then
    raise exception 'Secret comments are disabled';
  end if;

  store_admin_password := public.is_admin_user_password_visible();

  insert into board_comments (
    post_id,
    parent_id,
    author_name,
    content,
    password_hash,
    admin_visible_password,
    is_secret
  )
  values (
    p_post_id,
    p_parent_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when store_admin_password then p_password else null end,
    case when secret_enabled then coalesce(p_is_secret, false) else false end
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.unlock_secret_board_comment(
  p_id uuid,
  p_password text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  comment_content text;
  comment_secret boolean;
  comment_hidden boolean;
begin
  select password_hash, content, is_secret, is_hidden
  into stored_hash, comment_content, comment_secret, comment_hidden
  from board_comments
  where id = p_id;

  if stored_hash is null or comment_hidden then
    raise exception 'Comment not found';
  end if;

  if not coalesce(comment_secret, false) then
    return comment_content;
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  return comment_content;
end;
$$;

grant execute on function public.is_board_secret_comments_enabled() to anon, authenticated;
grant execute on function public.get_board_post_comments(uuid) to anon, authenticated;
grant execute on function public.create_user_board_comment(uuid, text, text, text, uuid, boolean) to anon, authenticated;
grant execute on function public.unlock_secret_board_comment(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END board-secret-comments.sql



-- >>> BEGIN board-secret-admin-comments.sql

-- Admin secret comments: hide content on main (same as user secret comments)

create or replace function public.get_board_post_comments(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  parent_id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  is_admin_managed boolean,
  is_secret boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.post_id,
    c.parent_id,
    c.author_name,
    case
      when coalesce(c.is_secret, false)
        and coalesce(c.is_admin_managed, false)
        and public.is_board_admin_secret_comments_main_visible_enabled() then c.content
      when coalesce(c.is_secret, false) then null
      else c.content
    end as content,
    c.is_hidden,
    coalesce(c.is_admin_managed, false) as is_admin_managed,
    coalesce(c.is_secret, false) as is_secret,
    c.created_at
  from board_comments c
  where c.post_id = p_post_id
    and c.is_hidden = false
  order by c.created_at asc;
$$;

notify pgrst, 'reload schema';

-- <<< END board-secret-admin-comments.sql



-- >>> BEGIN board-secret-comment-developer-features.sql

-- Developer Mode (Beta): admin secret comment visibility + parent unlock

alter table public.site_settings
  add column if not exists board_admin_secret_comments_main_visible_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_admin_secret_reply_parent_unlock_enabled boolean not null default false;

create or replace function public.is_board_admin_secret_comments_main_visible_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select board_admin_secret_comments_main_visible_enabled
      from public.site_settings
      where id = 1
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_board_admin_secret_reply_parent_unlock_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select board_admin_secret_reply_parent_unlock_enabled
      from public.site_settings
      where id = 1
      limit 1
    ),
    false
  );
$$;

create or replace function public.get_board_post_comments(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  parent_id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  is_admin_managed boolean,
  is_secret boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.post_id,
    c.parent_id,
    c.author_name,
    case
      when coalesce(c.is_secret, false)
        and coalesce(c.is_admin_managed, false)
        and public.is_board_admin_secret_comments_main_visible_enabled() then c.content
      when coalesce(c.is_secret, false) then null
      else c.content
    end as content,
    c.is_hidden,
    coalesce(c.is_admin_managed, false) as is_admin_managed,
    coalesce(c.is_secret, false) as is_secret,
    c.created_at
  from board_comments c
  where c.post_id = p_post_id
    and c.is_hidden = false
  order by c.created_at asc;
$$;

create or replace function public.unlock_admin_secret_reply_with_parent_password(
  p_reply_id uuid,
  p_parent_password text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  reply_content text;
  reply_secret boolean;
  reply_hidden boolean;
  reply_admin_managed boolean;
  reply_parent_id uuid;
  parent_hash text;
  parent_secret boolean;
  parent_hidden boolean;
begin
  if not (
    public.is_board_admin_secret_reply_parent_unlock_enabled()
    or public.is_board_secret_comments_enabled()
  ) then
    raise exception 'Parent unlock is disabled';
  end if;

  select
    r.content,
    coalesce(r.is_secret, false),
    r.is_hidden,
    coalesce(r.is_admin_managed, false),
    r.parent_id
  into reply_content, reply_secret, reply_hidden, reply_admin_managed, reply_parent_id
  from board_comments r
  where r.id = p_reply_id;

  if reply_content is null or reply_hidden then
    raise exception 'Comment not found';
  end if;

  if not reply_secret or not reply_admin_managed or reply_parent_id is null then
    raise exception 'Comment not found';
  end if;

  select
    p.password_hash,
    coalesce(p.is_secret, false),
    p.is_hidden
  into parent_hash, parent_secret, parent_hidden
  from board_comments p
  where p.id = reply_parent_id;

  if parent_hash is null or parent_hidden or not parent_secret then
    raise exception 'Parent comment not found';
  end if;

  if extensions.crypt(p_parent_password, parent_hash) <> parent_hash then
    raise exception 'Incorrect password';
  end if;

  return reply_content;
end;
$$;

grant execute on function public.is_board_admin_secret_comments_main_visible_enabled() to anon, authenticated;
grant execute on function public.is_board_admin_secret_reply_parent_unlock_enabled() to anon, authenticated;
grant execute on function public.get_board_post_comments(uuid) to anon, authenticated;
grant execute on function public.unlock_admin_secret_reply_with_parent_password(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END board-secret-comment-developer-features.sql



-- >>> BEGIN partner-instagram.sql

-- 이 파일은 supabase/setup.sql 로 통합되었습니다.

-- <<< END partner-instagram.sql



-- >>> BEGIN partner-categories.sql

-- 제휴업체 카테고리 설정
alter table public.site_settings
  add column if not exists partner_categories jsonb not null default '[]'::jsonb;

update public.site_settings
set partner_categories = jsonb_build_array(
  '음식점',
  '요리주점/바(BAR)',
  '카페/디저트',
  '뷰티/헤어',
  '생활/의료/기타'
)
where id = 1
  and (
    partner_categories is null
    or partner_categories = '[]'::jsonb
    or jsonb_array_length(partner_categories) = 0
  );

-- <<< END partner-categories.sql



-- >>> BEGIN partner-search-keywords.sql

-- 제휴 업체 검색 키워드 묶음 (관리자 커스텀)
alter table public.site_settings
  add column if not exists partner_search_keyword_groups jsonb not null default '[]'::jsonb;

-- <<< END partner-search-keywords.sql



-- >>> BEGIN partner-regions.sql

-- 제휴업체 지역 설정 및 partners.region 컬럼

alter table public.partners
  add column if not exists region text;

alter table public.site_settings
  add column if not exists partner_regions jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists partner_region_filter_enabled boolean not null default true;

update public.site_settings
set partner_regions = jsonb_build_array(
  '제원',
  '아라',
  '연동',
  '노형',
  '이도',
  '삼도',
  '오라',
  '기타'
)
where id = 1
  and (
    partner_regions is null
    or partner_regions = '[]'::jsonb
    or jsonb_array_length(partner_regions) = 0
  );

notify pgrst, 'reload schema';

-- <<< END partner-regions.sql



-- >>> BEGIN partner-regions-hierarchy.sql

-- 제휴 지역 계층 구조 (동·읍·면) 및 상세 검색 기본 상태

alter table public.site_settings
  add column if not exists partner_region_filter_default_expanded boolean not null default false;

update public.site_settings
set partner_regions = jsonb_build_array(
  jsonb_build_object(
    'id', 'jeju-city',
    'label', '제주시',
    'areas', jsonb_build_array('제원', '아라', '연동', '노형', '이도', '삼도', '오라', '기타')
  ),
  jsonb_build_object(
    'id', 'seogwipo-city',
    'label', '서귀포시',
    'areas', jsonb_build_array('중문', '서귀동', '대정', '남원', '표선', '성산', '기타')
  )
)
where id = 1
  and (
    partner_regions is null
    or partner_regions = '[]'::jsonb
    or jsonb_typeof(partner_regions->0) = 'string'
  );

update public.partners
set region = '제주시/' || region
where region is not null
  and region <> ''
  and position('/' in region) = 0;

notify pgrst, 'reload schema';

-- <<< END partner-regions-hierarchy.sql



-- >>> BEGIN partner-regions-dong-eup-myeon.sql

-- 제휴 지역: 제주시/서귀포시 + 동·읍·면 (동/읍/면 단독 구조에서 복구)

update public.site_settings
set partner_regions = jsonb_build_array(
  jsonb_build_object(
    'id', 'jeju-city',
    'label', '제주시',
    'areas', jsonb_build_array(
      '이도1동', '이도2동', '도남동', '건입동', '노형동', '도두동', '봉개동',
      '삼도1동', '삼도2동', '삼양동', '아라동', '월평동', '연동', '오라동',
      '외도동', '용담1동', '용담2동', '이호동', '일도1동', '일도2동', '화북동',
      '구좌읍', '애월읍', '조천읍', '한림읍',
      '우도면', '한경면', '추자면',
      '기타'
    )
  ),
  jsonb_build_object(
    'id', 'seogwipo-city',
    'label', '서귀포시',
    'areas', jsonb_build_array(
      '대륜동', '대천동', '동홍동', '서홍동', '송산동', '영천동',
      '예래동', '정방동', '중문동', '대포동', '중앙동', '천지동', '효돈동',
      '남원읍', '대정읍', '성산읍',
      '안덕면', '표선면',
      '기타'
    )
  )
)
where id = 1;

-- 동/읍/면 단독 형식 → 제주시/서귀포시 형식으로 복구
update public.partners set region = '제주시/연동' where region in ('동/연동', '동/제원');
update public.partners set region = '제주시/아라동' where region = '동/아라동';
update public.partners set region = '제주시/노형동' where region = '동/노형동';
update public.partners set region = '제주시/이도1동' where region = '동/이도1동';
update public.partners set region = '제주시/삼도1동' where region = '동/삼도1동';
update public.partners set region = '제주시/오라동' where region = '동/오라동';
update public.partners set region = '서귀포시/중문동' where region = '동/중문동';
update public.partners set region = '서귀포시/중앙동' where region = '동/중앙동';
update public.partners set region = '서귀포시/대정읍' where region = '읍/대정읍';
update public.partners set region = '서귀포시/남원읍' where region = '읍/남원읍';
update public.partners set region = '서귀포시/성산읍' where region = '읍/성산읍';
update public.partners set region = '서귀포시/표선면' where region = '면/표선면';
update public.partners set region = '제주시' where region = '동';
update public.partners set region = '제주시/아라동' where region = '제주시/아라';
update public.partners set region = '제주시/연동' where region = '제주시/연동';
update public.partners set region = '제주시/노형동' where region = '제주시/노형';
update public.partners set region = '제주시/이도1동' where region = '제주시/이도';
update public.partners set region = '제주시/삼도1동' where region = '제주시/삼도';
update public.partners set region = '제주시/오라동' where region = '제주시/오라';
update public.partners set region = '서귀포시/중문동' where region = '서귀포시/중문';
update public.partners set region = '서귀포시/중앙동' where region = '서귀포시/서귀동';
update public.partners set region = '서귀포시/대정읍' where region = '서귀포시/대정';
update public.partners set region = '서귀포시/남원읍' where region = '서귀포시/남원';
update public.partners set region = '서귀포시/표선면' where region = '서귀포시/표선';
update public.partners set region = '서귀포시/성산읍' where region = '서귀포시/성산';

notify pgrst, 'reload schema';

-- <<< END partner-regions-dong-eup-myeon.sql



-- >>> BEGIN partner-benefit-settings.sql

alter table public.site_settings
  add column if not exists partner_benefit_min_height_mobile integer not null default 150,
  add column if not exists partner_benefit_min_height_desktop integer not null default 200;

-- <<< END partner-benefit-settings.sql



-- >>> BEGIN partner-benefit-box-style.sql

-- Partner benefit box colors (admin > 혜택 tab)

alter table public.site_settings
  add column if not exists partner_benefit_box_bg_color text;

alter table public.site_settings
  add column if not exists partner_benefit_box_border_color text;

notify pgrst, 'reload schema';

-- <<< END partner-benefit-box-style.sql



-- >>> BEGIN partner-benefit-text-style.sql

-- Partner benefit text style (admin > 제휴업체 > 혜택)

alter table public.partners
  add column if not exists benefit_color text,
  add column if not exists benefit_bold boolean not null default false,
  add column if not exists benefit_italic boolean not null default false,
  add column if not exists benefit_underline boolean not null default false,
  add column if not exists benefit_strikethrough boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END partner-benefit-text-style.sql



-- >>> BEGIN partner-business-info.sql

-- 제휴 업체 영업 정보 (영업시간, 휴무일 등)

alter table public.partners
  add column if not exists business_info text;

notify pgrst, 'reload schema';

-- <<< END partner-business-info.sql



-- >>> BEGIN partner-business-info-collapse.sql

-- 제휴 카드 영업 정보 접기/펼치기 기본 상태 (admin > 혜택 설정)

alter table public.site_settings
  add column if not exists partner_business_info_default_expanded boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END partner-business-info-collapse.sql



-- >>> BEGIN partner-status-board-list.sql

-- Partner benefit status label + numbered board post list with comment count

alter table public.partners
  add column if not exists benefit_status_text text,
  add column if not exists benefit_status_color text,
  add column if not exists benefit_status_bold boolean not null default false,
  add column if not exists benefit_status_italic boolean not null default false,
  add column if not exists benefit_status_underline boolean not null default false;

alter table public.site_settings
  add column if not exists board_post_numbered_list_enabled boolean not null default false;

-- <<< END partner-status-board-list.sql



-- >>> BEGIN partner-status-strikethrough.sql

-- Partner status center line (strikethrough)

alter table public.partners
  add column if not exists benefit_status_strikethrough boolean not null default false;

-- <<< END partner-status-strikethrough.sql



-- >>> BEGIN partner-default-sort.sql

-- Main page default partner sort (false = oldest first, true = newest first)

alter table public.site_settings
  add column if not exists partner_default_sort_new boolean not null default false;

-- <<< END partner-default-sort.sql



-- >>> BEGIN partner-list-refresh.sql

-- 제휴 목록 새로고침 버튼 (admin > 게시글 분류 > 제휴 목록 설정)

alter table public.site_settings
  add column if not exists partner_list_refresh_enabled boolean not null default true;

notify pgrst, 'reload schema';

-- <<< END partner-list-refresh.sql



-- >>> BEGIN partner-tablet-settings.sql

-- 폴드·태블릿(768~1279px) 제휴 목록 별도 설정

alter table public.site_settings
  add column if not exists partners_tablet_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_tablet integer not null default 9,
  add column if not exists partners_grid_columns_tablet integer not null default 3,
  add column if not exists partner_benefit_min_height_tablet integer not null default 175;

notify pgrst, 'reload schema';

-- <<< END partner-tablet-settings.sql



-- >>> BEGIN partner-reactions.sql

-- 제휴 업체 추천/비추천 + 추천순 정렬

alter table public.partners
  add column if not exists like_count integer not null default 0,
  add column if not exists dislike_count integer not null default 0;

alter table public.site_settings
  add column if not exists partner_reactions_enabled boolean not null default true,
  add column if not exists partner_sort_recommended_enabled boolean not null default true;

create table if not exists public.partner_votes (
  partner_id uuid not null references public.partners(id) on delete cascade,
  voter_key text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (partner_id, voter_key)
);

alter table public.partner_votes enable row level security;

drop policy if exists "partner_votes_public_read" on public.partner_votes;
create policy "partner_votes_public_read"
  on public.partner_votes for select to anon, authenticated using (true);

drop function if exists public.react_partner(uuid, text, text);
drop function if exists public.react_partner(bigint, text, text);

create or replace function public.react_partner(
  p_partner_id uuid,
  p_reaction text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_reaction text;
  new_likes integer;
  new_dislikes integer;
begin
  if p_reaction not in ('like', 'dislike') then
    raise exception 'Invalid reaction';
  end if;

  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (
    select 1 from partners where id = p_partner_id and is_active = true
  ) then
    raise exception 'Partner not found';
  end if;

  select reaction into prev_reaction
  from partner_votes
  where partner_id = p_partner_id and voter_key = p_voter_key;

  if prev_reaction is null then
    insert into partner_votes (partner_id, voter_key, reaction)
    values (p_partner_id, p_voter_key, p_reaction);

    if p_reaction = 'like' then
      update partners set like_count = like_count + 1 where id = p_partner_id;
    else
      update partners set dislike_count = dislike_count + 1 where id = p_partner_id;
    end if;
  elsif prev_reaction = p_reaction then
    delete from partner_votes
    where partner_id = p_partner_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update partners set like_count = greatest(like_count - 1, 0) where id = p_partner_id;
    else
      update partners set dislike_count = greatest(dislike_count - 1, 0) where id = p_partner_id;
    end if;
  else
    update partner_votes
    set reaction = p_reaction
    where partner_id = p_partner_id and voter_key = p_voter_key;

    if p_reaction = 'like' then
      update partners
      set like_count = like_count + 1, dislike_count = greatest(dislike_count - 1, 0)
      where id = p_partner_id;
    else
      update partners
      set dislike_count = dislike_count + 1, like_count = greatest(like_count - 1, 0)
      where id = p_partner_id;
    end if;
  end if;

  select like_count, dislike_count
  into new_likes, new_dislikes
  from partners
  where id = p_partner_id;

  return jsonb_build_object(
    'like_count', new_likes,
    'dislike_count', new_dislikes,
    'reaction', (
      select reaction from partner_votes
      where partner_id = p_partner_id and voter_key = p_voter_key
    )
  );
end;
$$;

grant execute on function public.react_partner(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END partner-reactions.sql



-- >>> BEGIN partner-reviews.sql

-- 제휴 업체 후기 (텍스트 리뷰)

alter table public.partners
  add column if not exists review_count integer not null default 0;

alter table public.site_settings
  add column if not exists partner_reviews_enabled boolean not null default true;

create table if not exists public.partner_reviews (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  author_name text not null,
  content text not null,
  password_hash text not null,
  voter_key text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_reviews_partner_voter_idx
  on public.partner_reviews (partner_id, voter_key);

create index if not exists partner_reviews_partner_created_idx
  on public.partner_reviews (partner_id, created_at desc);

alter table public.partner_reviews enable row level security;

drop policy if exists "partner_reviews_public_read" on public.partner_reviews;
create policy "partner_reviews_public_read"
  on public.partner_reviews for select to anon, authenticated
  using (is_hidden = false);

drop policy if exists "partner_reviews_admin_all" on public.partner_reviews;
create policy "partner_reviews_admin_all"
  on public.partner_reviews for all to authenticated
  using (true)
  with check (true);

create or replace function public.sync_partner_review_count(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update partners
  set review_count = (
    select count(*)::integer
    from partner_reviews
    where partner_id = p_partner_id
  )
  where id = p_partner_id;
end;
$$;

drop function if exists public.get_partner_reviews(uuid);

create function public.get_partner_reviews(p_partner_id uuid)
returns table (
  id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.author_name, r.content, r.is_hidden, r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where r.partner_id = p_partner_id
    and p.is_active = true
  order by r.created_at desc;
$$;

create or replace function public.create_partner_review(
  p_partner_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  new_count integer;
begin
  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (
    select 1 from partners where id = p_partner_id and is_active = true
  ) then
    raise exception 'Partner not found';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into partner_reviews (
    partner_id,
    author_name,
    content,
    password_hash,
    voter_key,
    is_hidden
  )
  values (
    p_partner_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    false
  )
  returning id into new_id;

  perform public.sync_partner_review_count(p_partner_id);

  select review_count into new_count from partners where id = p_partner_id;

  return jsonb_build_object(
    'id', new_id,
    'review_count', new_count
  );
end;
$$;

create or replace function public.update_user_partner_review(
  p_id uuid,
  p_password text,
  p_author_name text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  target_partner_id uuid;
  new_count integer;
begin
  select password_hash, partner_id
  into stored_hash, target_partner_id
  from partner_reviews
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Review not found';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  update partner_reviews
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = p_id;

  select review_count into new_count from partners where id = target_partner_id;

  return jsonb_build_object('review_count', new_count);
end;
$$;

create or replace function public.delete_user_partner_review(
  p_id uuid,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  target_partner_id uuid;
  new_count integer;
begin
  select password_hash, partner_id
  into stored_hash, target_partner_id
  from partner_reviews
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Review not found';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  delete from partner_reviews where id = p_id;

  perform public.sync_partner_review_count(target_partner_id);

  select review_count into new_count from partners where id = target_partner_id;

  return jsonb_build_object('review_count', new_count);
end;
$$;

grant execute on function public.sync_partner_review_count(uuid) to anon, authenticated;
grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;
grant execute on function public.create_partner_review(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.update_user_partner_review(uuid, text, text, text) to anon, authenticated;
grant execute on function public.delete_user_partner_review(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END partner-reviews.sql



-- >>> BEGIN partner-reviews-allow-multiple.sql

-- 업체별·기기별 1개 후기 제한(upsert) 제거 → 후기 작성마다 새 글로 등록

alter table public.partner_reviews
  drop constraint if exists partner_reviews_partner_id_voter_key_key;

create index if not exists partner_reviews_partner_voter_idx
  on public.partner_reviews (partner_id, voter_key);

create or replace function public.create_partner_review(
  p_partner_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  new_count integer;
begin
  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (
    select 1 from partners where id = p_partner_id and is_active = true
  ) then
    raise exception 'Partner not found';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into partner_reviews (
    partner_id,
    author_name,
    content,
    password_hash,
    voter_key,
    is_hidden
  )
  values (
    p_partner_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    false
  )
  returning id into new_id;

  perform public.sync_partner_review_count(p_partner_id);

  select review_count into new_count from partners where id = p_partner_id;

  return jsonb_build_object(
    'id', new_id,
    'review_count', new_count
  );
end;
$$;

notify pgrst, 'reload schema';

-- <<< END partner-reviews-allow-multiple.sql



-- >>> BEGIN partner-reviews-migrate-fix.sql

-- 후기 관련 마이그레이션 통합 (반환 타입 변경 시 DROP 필요)
-- Supabase SQL Editor에서 이 파일만 실행하면 됩니다.

create or replace function public.sync_partner_review_count(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update partners
  set review_count = (
    select count(*)::integer
    from partner_reviews
    where partner_id = p_partner_id
  )
  where id = p_partner_id;
end;
$$;

drop function if exists public.get_partner_reviews(uuid);

create function public.get_partner_reviews(p_partner_id uuid)
returns table (
  id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.author_name, r.content, r.is_hidden, r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where r.partner_id = p_partner_id
    and p.is_active = true
  order by r.created_at desc;
$$;

alter table public.partner_reviews
  drop constraint if exists partner_reviews_partner_id_voter_key_key;

create index if not exists partner_reviews_partner_voter_idx
  on public.partner_reviews (partner_id, voter_key);

create or replace function public.create_partner_review(
  p_partner_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  new_count integer;
begin
  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (
    select 1 from partners where id = p_partner_id and is_active = true
  ) then
    raise exception 'Partner not found';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into partner_reviews (
    partner_id,
    author_name,
    content,
    password_hash,
    voter_key,
    is_hidden
  )
  values (
    p_partner_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    false
  )
  returning id into new_id;

  perform public.sync_partner_review_count(p_partner_id);

  select review_count into new_count from partners where id = p_partner_id;

  return jsonb_build_object(
    'id', new_id,
    'review_count', new_count
  );
end;
$$;

update public.partners p
set review_count = (
  select count(*)::integer
  from public.partner_reviews r
  where r.partner_id = p.id
);

grant execute on function public.sync_partner_review_count(uuid) to anon, authenticated;
grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;
grant execute on function public.create_partner_review(uuid, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END partner-reviews-migrate-fix.sql



-- >>> BEGIN partner-reviews-admin.sql

-- 제휴 후기 관리자 RPC + 숨김 안내 문구 설정

alter table public.site_settings
  add column if not exists partner_hidden_review_title text,
  add column if not exists partner_hidden_review_message text;

drop function if exists public.admin_list_partner_reviews(uuid);

create function public.admin_list_partner_reviews(p_partner_id uuid default null)
returns table (
  id uuid,
  partner_id uuid,
  partner_name text,
  author_name text,
  content text,
  is_hidden boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.partner_id,
    p.name as partner_name,
    r.author_name,
    r.content,
    r.is_hidden,
    r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where p_partner_id is null or r.partner_id = p_partner_id
  order by r.created_at desc;
$$;

create or replace function public.admin_set_partner_review_hidden(
  p_review_id uuid,
  p_hidden boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update partner_reviews
  set
    is_hidden = p_hidden,
    updated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'Review not found';
  end if;
end;
$$;

create or replace function public.admin_delete_partner_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_partner_id uuid;
begin
  select partner_id into target_partner_id
  from partner_reviews
  where id = p_review_id;

  if target_partner_id is null then
    raise exception 'Review not found';
  end if;

  delete from partner_reviews where id = p_review_id;

  perform public.sync_partner_review_count(target_partner_id);
end;
$$;

grant execute on function public.admin_list_partner_reviews(uuid) to authenticated;
grant execute on function public.admin_set_partner_review_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_partner_review(uuid) to authenticated;

notify pgrst, 'reload schema';

-- <<< END partner-reviews-admin.sql



-- >>> BEGIN partner-reviews-admin-password.sql

-- 제휴 후기 관리자 비밀번호 표시 (개발자 모드)

alter table public.site_settings
  add column if not exists admin_partner_review_password_visible boolean not null default false;

alter table public.partner_reviews
  add column if not exists admin_visible_password text;

create or replace function public.is_admin_partner_review_password_visible()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select admin_partner_review_password_visible from public.site_settings where id = 1 limit 1),
    false
  );
$$;

create or replace function public.create_partner_review(
  p_partner_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_voter_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  new_count integer;
  store_admin_password boolean;
begin
  if char_length(trim(p_voter_key)) < 8 then
    raise exception 'Invalid voter key';
  end if;

  if not exists (
    select 1 from partners where id = p_partner_id and is_active = true
  ) then
    raise exception 'Partner not found';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  store_admin_password := public.is_admin_partner_review_password_visible();

  insert into partner_reviews (
    partner_id,
    author_name,
    content,
    password_hash,
    voter_key,
    is_hidden,
    admin_visible_password
  )
  values (
    p_partner_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_voter_key,
    false,
    case when store_admin_password then p_password else null end
  )
  returning id into new_id;

  perform public.sync_partner_review_count(p_partner_id);

  select review_count into new_count from partners where id = p_partner_id;

  return jsonb_build_object(
    'id', new_id,
    'review_count', new_count
  );
end;
$$;

create or replace function public.update_user_partner_review(
  p_id uuid,
  p_password text,
  p_author_name text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  target_partner_id uuid;
  new_count integer;
  store_admin_password boolean;
begin
  select password_hash, partner_id
  into stored_hash, target_partner_id
  from partner_reviews
  where id = p_id and is_hidden = false;

  if stored_hash is null then
    raise exception 'Review not found';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  store_admin_password := public.is_admin_partner_review_password_visible();

  update partner_reviews
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    admin_visible_password = case when store_admin_password then p_password else null end,
    updated_at = now()
  where id = p_id;

  select review_count into new_count from partners where id = target_partner_id;

  return jsonb_build_object('review_count', new_count);
end;
$$;

drop function if exists public.admin_list_partner_reviews(uuid);

create function public.admin_list_partner_reviews(p_partner_id uuid default null)
returns table (
  id uuid,
  partner_id uuid,
  partner_name text,
  author_name text,
  content text,
  is_hidden boolean,
  admin_visible_password text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.partner_id,
    p.name as partner_name,
    r.author_name,
    r.content,
    r.is_hidden,
    r.admin_visible_password,
    r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where p_partner_id is null or r.partner_id = p_partner_id
  order by r.created_at desc;
$$;

grant execute on function public.is_admin_partner_review_password_visible() to anon, authenticated;
grant execute on function public.create_partner_review(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.update_user_partner_review(uuid, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_partner_reviews(uuid) to authenticated;

notify pgrst, 'reload schema';

-- <<< END partner-reviews-admin-password.sql



-- >>> BEGIN partner-reviews-hidden-display.sql

-- 숨김 후기도 목록에 포함(본문은 노출하지 않음). 게시글 숨김과 동일하게 메인 안내 문구 표시용.

create or replace function public.sync_partner_review_count(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update partners
  set review_count = (
    select count(*)::integer
    from partner_reviews
    where partner_id = p_partner_id
  )
  where id = p_partner_id;
end;
$$;

drop function if exists public.get_partner_reviews(uuid);

create function public.get_partner_reviews(p_partner_id uuid)
returns table (
  id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.author_name, r.content, r.is_hidden, r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where r.partner_id = p_partner_id
    and p.is_active = true
  order by r.created_at desc;
$$;

grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;

-- 기존 review_count를 숨김 포함 전체 건수로 맞춤
update public.partners p
set review_count = (
  select count(*)::integer
  from public.partner_reviews r
  where r.partner_id = p.id
);

notify pgrst, 'reload schema';

-- <<< END partner-reviews-hidden-display.sql



-- >>> BEGIN site-title.sql

-- 브라우저 탭 사이트 제목 설정
alter table public.site_settings
  add column if not exists site_title text;

alter table public.site_settings
  add column if not exists admin_site_title text;

-- <<< END site-title.sql



-- >>> BEGIN site-favicon.sql

-- 사이트 파비콘(브라우저 탭 아이콘) 설정
alter table public.site_settings
  add column if not exists site_favicon_url text;

-- <<< END site-favicon.sql



-- >>> BEGIN site-domain.sql

-- 메인 도메인(공식 사이트 URL) 설정

alter table public.site_settings
  add column if not exists main_domain text;

notify pgrst, 'reload schema';

-- <<< END site-domain.sql



-- >>> BEGIN site-loading-message.sql

-- 메인 페이지 로딩 문구 (관리자 설정)



alter table public.site_settings

  add column if not exists site_loading_message text,

  add column if not exists partners_loading_message text;



notify pgrst, 'reload schema';

-- <<< END site-loading-message.sql



-- >>> BEGIN site-loading-image.sql

-- 메인 페이지 로딩 이미지 (관리자 설정)



alter table public.site_settings

  add column if not exists site_loading_image_url text,

  add column if not exists partners_loading_image_url text;



notify pgrst, 'reload schema';

-- <<< END site-loading-image.sql



-- >>> BEGIN site-maintenance.sql

-- Site maintenance notice on main page

alter table public.site_settings
  add column if not exists site_maintenance_text text,
  add column if not exists site_maintenance_image_url text,
  add column if not exists site_maintenance_enabled boolean not null default false;

-- <<< END site-maintenance.sql



-- >>> BEGIN site-popups.sql

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

-- <<< END site-popups.sql



-- >>> BEGIN sidebar-ads.sql

-- 이 파일은 supabase/setup.sql 로 통합되었습니다.

-- <<< END sidebar-ads.sql



-- >>> BEGIN link-preview-settings.sql

-- 링크 미리보기(카카오톡·SNS 공유) 전용 설정
alter table public.site_settings
  add column if not exists link_preview_title text,
  add column if not exists link_preview_description text,
  add column if not exists link_preview_image_url text;

notify pgrst, 'reload schema';

-- <<< END link-preview-settings.sql



-- >>> BEGIN notice-text-link.sql

-- 공지사항 문구 링크 설정
alter table public.site_settings
  add column if not exists notice_text_link_url text;

-- <<< END notice-text-link.sql



-- >>> BEGIN notice-text-color.sql

-- 공지사항 문구 색상 설정
alter table public.site_settings
  add column if not exists notice_text_color text;

-- <<< END notice-text-color.sql



-- >>> BEGIN notice-items.sql

-- 메인 공지 캐러셀 항목
alter table public.site_settings
  add column if not exists notice_text_link_url text,
  add column if not exists notice_items jsonb not null default '[]'::jsonb;
update public.site_settings
set notice_items = jsonb_build_array(
  jsonb_build_object(
    'id', 'notice-1',
    'tag', null,
    'text', notice_text,
    'link_url', notice_text_link_url,
    'enabled', true
  )
)
where id = 1
  and (
    notice_items is null
    or notice_items = '[]'::jsonb
    or jsonb_array_length(notice_items) = 0
  )
  and coalesce(trim(notice_text), '') <> '';

-- <<< END notice-items.sql



-- >>> BEGIN notice-carousel-auto.sql

alter table public.site_settings
  add column if not exists notice_carousel_auto_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists notice_carousel_auto_interval_seconds integer not null default 5;

update public.site_settings
set notice_carousel_auto_interval_seconds = 5
where id = 1
  and (
    notice_carousel_auto_interval_seconds is null
    or notice_carousel_auto_interval_seconds < 3
    or notice_carousel_auto_interval_seconds > 30
  );

-- <<< END notice-carousel-auto.sql



-- >>> BEGIN footer-text.sql

-- Custom footer text on main page

alter table public.site_settings
  add column if not exists footer_text text,
  add column if not exists footer_text_enabled boolean not null default false,
  add column if not exists footer_link_label text,
  add column if not exists footer_link_url text;

-- <<< END footer-text.sql



-- >>> BEGIN footer-link.sql

-- Footer inline link (admin > 설정 > 메인 하단 문구)

alter table public.site_settings
  add column if not exists footer_link_label text,
  add column if not exists footer_link_url text;

notify pgrst, 'reload schema';

-- <<< END footer-link.sql



-- >>> BEGIN footer-policy-links.sql

-- Footer policy links: privacy policy + terms of service

alter table public.site_settings
  add column if not exists footer_privacy_policy_url text,
  add column if not exists footer_terms_url text;

notify pgrst, 'reload schema';

-- <<< END footer-policy-links.sql



-- >>> BEGIN footer-business-info.sql

-- Footer business info + copyright (admin > 메인 하단 문구)

alter table public.site_settings
  add column if not exists footer_business_line1 text,
  add column if not exists footer_business_line2 text,
  add column if not exists footer_copyright text;

notify pgrst, 'reload schema';

-- <<< END footer-business-info.sql



-- >>> BEGIN footer-image.sql

-- Footer image (admin > 메인 하단 문구)

alter table public.site_settings
  add column if not exists footer_image_url text;

notify pgrst, 'reload schema';

-- <<< END footer-image.sql



-- >>> BEGIN footer-image2.sql

-- Footer second image (admin > 메인 하단 문구)

alter table public.site_settings
  add column if not exists footer_image2_url text;

notify pgrst, 'reload schema';

-- <<< END footer-image2.sql



-- >>> BEGIN text-color-settings.sql

-- Footer and settings panel notice text colors

alter table public.site_settings
  add column if not exists footer_text_color text,
  add column if not exists settings_panel_notice_color text;

notify pgrst, 'reload schema';

-- <<< END text-color-settings.sql



-- >>> BEGIN page-background-settings.sql

alter table public.site_settings
  add column if not exists page_background_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists page_background_color text;

alter table public.site_settings
  add column if not exists page_background_image_url text;

notify pgrst, 'reload schema';

-- <<< END page-background-settings.sql



-- >>> BEGIN page-background-default-enabled.sql

alter table public.site_settings
  add column if not exists page_background_default_enabled boolean not null default true;

notify pgrst, 'reload schema';

-- <<< END page-background-default-enabled.sql



-- >>> BEGIN error-page-settings.sql

alter table public.site_settings
  add column if not exists error_pages_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists error_page_logo_url text;

alter table public.site_settings
  add column if not exists error_page_bg_color text;

alter table public.site_settings
  add column if not exists error_page_text_color text;

alter table public.site_settings
  add column if not exists error_page_button_bg_color text;

alter table public.site_settings
  add column if not exists error_page_button_text_color text;

alter table public.site_settings
  add column if not exists error_page_button_label text;

alter table public.site_settings
  add column if not exists error_page_not_found_title text;

alter table public.site_settings
  add column if not exists error_page_not_found_message text;

alter table public.site_settings
  add column if not exists error_page_server_error_title text;

alter table public.site_settings
  add column if not exists error_page_server_error_message text;

notify pgrst, 'reload schema';

-- <<< END error-page-settings.sql



-- >>> BEGIN main-font-size-setting.sql

-- 메인 글씨 크기 설정 (개발자 모드 → 메인 설정 패널)

alter table public.site_settings
  add column if not exists main_font_size_enabled boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END main-font-size-setting.sql



-- >>> BEGIN main-site-size-floating.sql

-- 사이트 크기 +/- 플로ating 버튼 (admin > 개발자 모드 > 설정)

alter table public.site_settings
  add column if not exists main_site_size_floating_enabled boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END main-site-size-floating.sql



-- >>> BEGIN main-board-position-setting.sql

-- 메인 게시판 위치 설정 (개발자 모드 → 메인 설정 패널)

alter table public.site_settings
  add column if not exists main_board_position_enabled boolean not null default false,
  add column if not exists main_board_position_default text not null default 'above';

notify pgrst, 'reload schema';

-- <<< END main-board-position-setting.sql



-- >>> BEGIN settings-panel-notice.sql

-- Main page settings panel notice text and optional URL (admin > 설정 tab)

alter table public.site_settings
  add column if not exists settings_panel_notice_text text;

alter table public.site_settings
  add column if not exists settings_panel_notice_url text;

alter table public.site_settings
  add column if not exists settings_panel_enabled boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END settings-panel-notice.sql



-- >>> BEGIN developer-mode-beta.sql

-- Developer Mode (Beta) settings and admin-visible user passwords

alter table public.site_settings
  add column if not exists mobile_pc_mode_enabled boolean not null default false,
  add column if not exists dark_mode_enabled boolean not null default false,
  add column if not exists google_ads_enabled boolean not null default false,
  add column if not exists google_ads_malware_block_enabled boolean not null default false,
  add column if not exists ad_video_gif_enabled boolean not null default false,
  add column if not exists admin_user_password_visible boolean not null default false;

alter table public.board_posts
  add column if not exists admin_visible_password text;

alter table public.board_comments
  add column if not exists admin_visible_password text;

create or replace function public.is_admin_user_password_visible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select admin_user_password_visible from public.site_settings where id = 1 limit 1),
    false
  );
$$;

drop function if exists public.create_user_board_post(text, text, text, text, text);
drop function if exists public.update_user_board_post(uuid, text, text, text, text);

create or replace function public.create_user_board_post(
  p_board_type text,
  p_title text,
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
  store_admin_password boolean;
begin
  if not public.is_user_writable_board(p_board_type) then
    raise exception 'Invalid board type';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  store_admin_password := public.is_admin_user_password_visible();

  insert into board_posts (
    board_type,
    title,
    author_name,
    content,
    password_hash,
    admin_visible_password
  )
  values (
    p_board_type,
    trim(p_title),
    trim(p_author_name),
    p_content,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when store_admin_password then p_password else null end
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_user_board_post(
  p_id uuid,
  p_password text,
  p_title text,
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
  stored_type text;
  store_admin_password boolean;
begin
  select password_hash, board_type
  into stored_hash, stored_type
  from board_posts
  where id = p_id;

  if stored_hash is null then
    raise exception 'Incorrect password';
  end if;

  if not public.is_user_writable_board(stored_type) then
    raise exception 'This post cannot be edited here';
  end if;

  if extensions.crypt(p_password, stored_hash) <> stored_hash then
    raise exception 'Incorrect password';
  end if;

  store_admin_password := public.is_admin_user_password_visible();

  update board_posts
  set
    title = trim(p_title),
    author_name = trim(p_author_name),
    content = p_content,
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    admin_visible_password = case when store_admin_password then p_password else null end
  where id = p_id;

  return true;
end;
$$;

drop function if exists public.create_user_board_comment(uuid, text, text, text);
drop function if exists public.create_user_board_comment(uuid, text, text, text, uuid);

create or replace function public.create_user_board_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_password text,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  post_hidden boolean;
  parent_post_id uuid;
  parent_hidden boolean;
  store_admin_password boolean;
begin
  select is_hidden into post_hidden from board_posts where id = p_post_id;

  if post_hidden is null or post_hidden then
    raise exception 'Post not found';
  end if;

  if p_parent_id is not null then
    select post_id, is_hidden
    into parent_post_id, parent_hidden
    from board_comments
    where id = p_parent_id;

    if parent_post_id is null or parent_hidden then
      raise exception 'Parent comment not found';
    end if;

    if parent_post_id <> p_post_id then
      raise exception 'Parent comment not found';
    end if;
  end if;

  if char_length(trim(p_author_name)) = 0 or char_length(trim(p_content)) = 0 then
    raise exception 'Author and content are required';
  end if;

  if char_length(trim(p_password)) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  store_admin_password := public.is_admin_user_password_visible();

  insert into board_comments (
    post_id,
    parent_id,
    author_name,
    content,
    password_hash,
    admin_visible_password
  )
  values (
    p_post_id,
    p_parent_id,
    trim(p_author_name),
    trim(p_content),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when store_admin_password then p_password else null end
  )
  returning id into new_id;

  return new_id;
end;
$$;

drop function if exists public.update_user_board_comment(uuid, text, text, text);

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
  store_admin_password boolean;
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

  store_admin_password := public.is_admin_user_password_visible();

  update board_comments
  set
    author_name = trim(p_author_name),
    content = trim(p_content),
    password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    admin_visible_password = case when store_admin_password then p_password else null end
  where id = p_id;

  return true;
end;
$$;

grant execute on function public.is_admin_user_password_visible() to anon, authenticated;
grant execute on function public.create_user_board_post(text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_user_board_post(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.create_user_board_comment(uuid, text, text, text, uuid) to anon, authenticated;
grant execute on function public.update_user_board_comment(uuid, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- <<< END developer-mode-beta.sql



-- >>> BEGIN admin-posts-board-beta.sql

-- Developer Mode Beta: admin posts list pagination + board page creation

alter table public.site_settings
  add column if not exists admin_posts_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_posts_per_page integer not null default 10;

alter table public.site_settings
  add column if not exists board_page_create_enabled boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END admin-posts-board-beta.sql



-- >>> BEGIN admin-partners-list-pagination.sql

alter table public.site_settings
  add column if not exists admin_partners_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_partners_per_page integer not null default 10;

notify pgrst, 'reload schema';

-- <<< END admin-partners-list-pagination.sql



-- >>> BEGIN pending-developer-mode-columns.sql

-- 개발자 모드 저장 오류 시 Supabase SQL Editor에서 이 파일을 실행하세요.
-- (Could not find the '...' column of 'site_settings' in the schema cache)

alter table public.site_settings
  add column if not exists board_pinned_persist_pages_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_pinned_also_in_list_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_partners_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_partners_per_page integer not null default 10;

alter table public.site_settings
  add column if not exists board_secret_comments_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_admin_secret_comments_main_visible_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_admin_secret_reply_parent_unlock_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists board_list_font_size_compact integer not null default 10;

alter table public.site_settings
  add column if not exists board_list_font_size_desktop integer not null default 11;

alter table public.site_settings
  add column if not exists board_post_detail_font_size integer not null default 16;

alter table public.board_comments
  add column if not exists is_secret boolean not null default false;

alter table public.site_settings
  add column if not exists settings_panel_notice_text text;

alter table public.site_settings
  add column if not exists settings_panel_notice_url text;

alter table public.site_settings
  add column if not exists partner_benefit_box_bg_color text;

alter table public.site_settings
  add column if not exists partner_benefit_box_border_color text;

alter table public.site_settings
  add column if not exists board_sort_views_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists board_list_refresh_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists board_id_mode_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists footer_text_color text,
  add column if not exists settings_panel_notice_color text;

alter table public.site_settings
  add column if not exists settings_panel_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_posts_list_pagination_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists admin_posts_per_page integer not null default 10;

alter table public.site_settings
  add column if not exists board_page_create_enabled boolean not null default false;

alter table public.site_settings
  add column if not exists partners_tablet_settings_enabled boolean not null default false,
  add column if not exists partners_per_page_tablet integer not null default 9,
  add column if not exists partners_grid_columns_tablet integer not null default 3,
  add column if not exists partner_benefit_min_height_tablet integer not null default 175;

alter table public.partners
  add column if not exists region text;

alter table public.site_settings
  add column if not exists partner_regions jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists partner_region_filter_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists partner_region_filter_default_expanded boolean not null default false;

alter table public.site_settings
  add column if not exists partner_business_info_default_expanded boolean not null default false;

alter table public.site_settings
  add column if not exists main_site_size_floating_enabled boolean not null default false;

notify pgrst, 'reload schema';

-- <<< END pending-developer-mode-columns.sql



-- >>> BEGIN admin-permissions.sql

-- Admin user permissions (Supabase Authentication users)

create table if not exists public.admin_user_permissions (
  user_id uuid primary key,
  email text not null,
  role text not null default 'admin' check (role in ('developer', 'admin')),
  is_active boolean not null default true,
  can_settings boolean not null default false,
  can_ads boolean not null default false,
  can_partners boolean not null default false,
  can_board_settings boolean not null default false,
  can_boards boolean not null default false,
  can_posts boolean not null default false,
  can_developer boolean not null default false,
  can_permissions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_user_permissions_email_idx
  on public.admin_user_permissions (email);

create or replace function public.is_admin_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_user_permissions
    where user_id = auth.uid()
      and is_active = true
      and role = 'developer'
  );
$$;

create or replace function public.has_admin_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_user_permissions p
    where p.user_id = auth.uid()
      and p.is_active = true
      and (
        p.role = 'developer'
        or case p_permission
          when 'settings' then p.can_settings
          when 'ads' then p.can_ads
          when 'partners' then p.can_partners
          when 'board-settings' then p.can_board_settings
          when 'boards' then p.can_boards
          when 'posts' then p.can_posts
          when 'developer' then p.can_developer
          when 'permissions' then p.can_permissions
          else false
        end
      )
  );
$$;

alter table public.admin_user_permissions enable row level security;

drop policy if exists "admin_permissions_read_own" on public.admin_user_permissions;
create policy "admin_permissions_read_own"
  on public.admin_user_permissions
  for select
  to authenticated
  using (user_id = auth.uid());

grant execute on function public.is_admin_developer() to authenticated;
grant execute on function public.has_admin_permission(text) to authenticated;

alter table public.site_settings
  add column if not exists developer_user_id uuid,
  add column if not exists admin_developer_email text;

update public.site_settings
set admin_developer_email = 'secretobeing@gmail.com'
where id = 1
  and (admin_developer_email is null or admin_developer_email = '');

-- <<< END admin-permissions.sql



-- >>> BEGIN admin-permissions-tab-grants.sql

-- Add 관리자 권한 tab permission flag

alter table public.admin_user_permissions
  add column if not exists can_permissions boolean not null default false;

create or replace function public.has_admin_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_user_permissions p
    where p.user_id = auth.uid()
      and p.is_active = true
      and (
        p.role = 'developer'
        or case p_permission
          when 'settings' then p.can_settings
          when 'ads' then p.can_ads
          when 'partners' then p.can_partners
          when 'board-settings' then p.can_board_settings
          when 'boards' then p.can_boards
          when 'posts' then p.can_posts
          when 'developer' then p.can_developer
          when 'permissions' then p.can_permissions
          else false
        end
      )
  );
$$;

-- <<< END admin-permissions-tab-grants.sql


-- ============================================================
-- After running this script:
-- 1) Authentication → Users → Add user (admin email/password)
-- 2) Replace placeholders below, then run admin grant SQL
-- ============================================================
