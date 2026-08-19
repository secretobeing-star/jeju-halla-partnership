-- 관리자 작성 콘텐츠 신고 차단: 목록 RPC에 is_admin_managed 포함 + 제휴 후기 플래그

alter table public.partner_reviews
  add column if not exists is_admin_managed boolean not null default false;

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
  is_admin_managed boolean,
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
    coalesce(p.is_admin_managed, false) as is_admin_managed,
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
  is_admin_managed boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.author_name,
    r.content,
    r.is_hidden,
    r.admin_action_reason,
    coalesce(r.is_admin_managed, false) as is_admin_managed,
    r.created_at
  from partner_reviews r
  join partners p on p.id = r.partner_id
  where r.partner_id = p_partner_id
    and p.is_active = true
  order by r.created_at desc;
$$;

grant execute on function public.get_partner_reviews(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
