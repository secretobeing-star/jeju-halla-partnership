-- 정지/숨김 처리 시 관리자 사유를 콘텐츠에 저장하고 사용자에게 표시 (게시글·댓글·제휴 후기)

alter table public.board_posts
  add column if not exists admin_action_reason text;

alter table public.board_comments
  add column if not exists admin_action_reason text;

alter table public.partner_reviews
  add column if not exists admin_action_reason text;

drop function if exists public.list_board_posts_for_display(text, boolean, text[]);

create function public.list_board_posts_for_display(
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
  admin_action_reason text,
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
    p.admin_action_reason,
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

drop function if exists public.get_partner_reviews(uuid);

create function public.get_partner_reviews(p_partner_id uuid)
returns table (
  id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  admin_action_reason text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.author_name, r.content, r.is_hidden, r.admin_action_reason, r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where r.partner_id = p_partner_id
    and p.is_active = true
  order by r.created_at desc;
$$;

grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;

drop function if exists public.get_board_post_comments(uuid);

create function public.get_board_post_comments(p_post_id uuid)
returns table (
  id uuid,
  post_id uuid,
  parent_id uuid,
  author_name text,
  content text,
  is_hidden boolean,
  is_admin_managed boolean,
  is_secret boolean,
  admin_action_reason text,
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
      when c.is_hidden then null
      when coalesce(c.is_secret, false)
        and coalesce(c.is_admin_managed, false)
        and public.is_board_admin_secret_comments_main_visible_enabled() then c.content
      when coalesce(c.is_secret, false) then null
      else c.content
    end as content,
    c.is_hidden,
    coalesce(c.is_admin_managed, false) as is_admin_managed,
    coalesce(c.is_secret, false) as is_secret,
    c.admin_action_reason,
    c.created_at
  from board_comments c
  where c.post_id = p_post_id
  order by c.created_at asc;
$$;

grant execute on function public.get_board_post_comments(uuid) to anon, authenticated;

drop function if exists public.admin_set_partner_review_hidden(uuid, boolean);
drop function if exists public.admin_set_partner_review_hidden(uuid, boolean, text);

create or replace function public.admin_set_partner_review_hidden(
  p_review_id uuid,
  p_hidden boolean,
  p_admin_action_reason text default null
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
    admin_action_reason = case
      when p_hidden then nullif(trim(p_admin_action_reason), '')
      else null
    end,
    updated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'Review not found';
  end if;
end;
$$;

grant execute on function public.admin_set_partner_review_hidden(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
