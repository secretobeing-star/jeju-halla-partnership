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
