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
