-- Stubs/columns needed before secret post/comment SQL runs.
-- developer-mode-beta.sql later replaces is_admin_user_password_visible().

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
  select false;
$$;

notify pgrst, 'reload schema';
