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
