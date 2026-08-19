-- 게시글 고정(공지) 한 번에 수정 — Supabase SQL Editor에서 통째로 Run
-- (여러 번 실행해도 안전)

alter table public.board_posts
  add column if not exists is_pinned boolean not null default false;

alter table public.board_posts
  add column if not exists pinned_at timestamptz;

alter table public.board_posts
  add column if not exists is_secret boolean not null default false;

alter table public.board_posts
  add column if not exists view_count integer not null default 0;

alter table public.board_posts
  add column if not exists like_count integer not null default 0;

alter table public.board_posts
  add column if not exists dislike_count integer not null default 0;

create index if not exists board_posts_pinned_idx
  on public.board_posts (board_type, is_pinned desc, pinned_at desc nulls last, created_at desc);

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

-- 고정 공지 UI (커뮤니티형 목록 + 조회수) 기본 켜기
update public.site_settings
set
  board_post_numbered_list_enabled = true,
  board_pinned_post_large_enabled = true,
  board_post_views_enabled = true
where id = 1;
