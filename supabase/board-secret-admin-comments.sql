-- Admin secret comments: hide content on main (same as user secret comments)

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

notify pgrst, 'reload schema';
