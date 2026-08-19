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
