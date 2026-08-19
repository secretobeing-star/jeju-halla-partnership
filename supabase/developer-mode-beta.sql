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
