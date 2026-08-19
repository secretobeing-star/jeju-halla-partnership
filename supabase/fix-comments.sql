-- ============================================================
-- 댓글 기능 한 번에 설치 (Supabase SQL Editor → New query → Run)
-- ============================================================

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

  if post_hidden is null or post_hidden then
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
