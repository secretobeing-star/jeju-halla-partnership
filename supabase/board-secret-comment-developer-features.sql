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
